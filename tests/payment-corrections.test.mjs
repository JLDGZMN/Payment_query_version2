import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { parseEnv } from "node:util";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const cache = new Map();
// Run the same TypeScript used by the API without introducing a test runner dependency.
function load(relativePath) {
  const filename = resolve(root, relativePath);
  if (cache.has(filename)) return cache.get(filename).exports;
  const compiledModule = { exports: {} };
  cache.set(filename, compiledModule);
  const output = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const localRequire = (specifier) => {
    if (specifier.startsWith("@/")) return load(`${specifier.slice(2)}.ts`);
    if (specifier.startsWith(".")) return load(resolve(dirname(filename), `${specifier}.ts`));
    return require(specifier);
  };
  new Function("require", "module", "exports", output)(localRequire, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}

const { getPaymentInsertError, COLLECTORS } = load("lib/payment-validation.ts");
const { insertPayment } = load("app/api/payments/insert-payment.ts");
const { PAYMENT_SELECT_SQL, serializePayments } = load("app/api/payments/payment-record.ts");
const body = (start = "1000000", pieces = 10, extra = {}) => ({
  or_date: "2026-01-01", or_no_start: start,
  or_no_end: String(Number(start) + pieces - 1).padStart(7, "0"),
  pieces, rcd_amount: 1234.50, collector: COLLECTORS[0], ...extra,
});

test("reinsertion still enforces dates, seven-digit ranges, pieces, amounts, and collectors", () => {
  assert.equal(getPaymentInsertError(body()), null);
  for (const change of [
    { or_date: "2099-01-01" }, { or_date: "2026-02-30" }, { or_no_start: "100" },
    { pieces: 0 }, { pieces: 1.5 }, { or_no_end: "1000040" },
    { rcd_amount: -1 }, { rcd_amount: 0 }, { rcd_amount: "1.234" },
    { rcd_amount: "10000000000.00" }, { collector: "Unknown Collector" },
  ]) assert.ok(getPaymentInsertError(body("1000000", 10, change)), JSON.stringify(change));
});

test("acknowledgements must be distinct positive record IDs", () => {
  for (const ids of [[1, 1], [0], [-1], ["1"], [1.2], null, true]) {
    assert.ok(getPaymentInsertError(body("1000000", 10, { acknowledged_voided_ids: ids })));
  }
  assert.equal(getPaymentInsertError(body("1000000", 10, { acknowledged_voided_ids: [1, 2] })), null);
});

test("MySQL: confirmation, active duplicates, correction chains, partial overlaps, and rollback", {
  skip: process.env.PAYMENT_DB_TESTS !== "1",
}, async (t) => {
  const mysql = await import("mysql2/promise");
  const env = parseEnv(readFileSync(resolve(root, ".env"), "utf8"));
  const conn = await mysql.createConnection(process.env.DATABASE_URL || env.DATABASE_URL);
  // Session-local temporary tables shadow real tables. No real payment is changed.
  const pool = { getConnection: async () => new Proxy(conn, {
    get(target, property) {
      if (property === "release") return () => {};
      const value = Reflect.get(target, property);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) };
  try {
    await conn.query("CREATE TEMPORARY TABLE test_payments LIKE payments");
    await conn.query("ALTER TABLE test_payments RENAME TO payments");
    await conn.query("CREATE TEMPORARY TABLE test_payment_corrections LIKE payment_corrections");
    await conn.query("ALTER TABLE test_payment_corrections RENAME TO payment_corrections");
    const [users] = await conn.query("SELECT id FROM user ORDER BY id LIMIT 1");
    assert.ok(users.length, "An existing user is required");
    const userId = users[0].id;
    const count = async () => (await conn.query("SELECT COUNT(*) AS n FROM payments"))[0][0].n;
    const get = async (id) => (await serializePayments((await conn.execute(`${PAYMENT_SELECT_SQL} WHERE p.id=?`, [id]))[0], conn))[0];
    const voidPayment = async (id) => conn.execute("UPDATE payments SET status='Void', voided_at=CURRENT_TIMESTAMP, voided_by_user_id=?, updated_by_user_id=? WHERE id=?", [userId, userId, id]);

    let original, corrected;
    await t.test("ordinary inserts need no void confirmation", async () => {
      const result = await insertPayment(pool, body(), userId);
      assert.equal(result.status, 201);
      original = result.data;
      assert.deepEqual(original.correction_of_ids, []);
      assert.deepEqual(original.replacement_ids, []);
      await voidPayment(original.id);
    });
    const originalSnapshot = JSON.stringify(await get(original.id));

    await t.test("unacknowledged and forged matches do not save records", async () => {
      for (const ids of [[], [original.id + 9999]]) {
        const result = await insertPayment(pool, body("1000000", 10, { acknowledged_voided_ids: ids }), userId);
        assert.equal(result.status, 409);
        assert.equal(result.data.code, "VOID_CONFIRMATION_REQUIRED");
        assert.deepEqual(result.data.voided_records.map((row) => row.id), [original.id]);
        assert.equal(await count(), 1);
      }
    });

    await t.test("Proceed saves a new record and preserves every original audit field", async () => {
      const result = await insertPayment(pool, body("1000000", 10, { rcd_amount: 9876, collector: COLLECTORS[1], acknowledged_voided_ids: [original.id] }), userId);
      assert.equal(result.status, 201);
      corrected = result.data;
      assert.notEqual(corrected.id, original.id);
      assert.equal(corrected.created_by_user_id, userId);
      assert.equal(corrected.updated_by_user_id, userId);
      assert.deepEqual(corrected.correction_of_ids, [original.id]);
      const refreshed = await get(original.id);
      assert.deepEqual(refreshed.replacement_ids, [corrected.id]);
      assert.equal(JSON.stringify({ ...refreshed, replacement_ids: [] }), originalSnapshot);
    });

    await t.test("active overlap is blocked even when void matches are acknowledged", async () => {
      const result = await insertPayment(pool, body("1000005", 3, { acknowledged_voided_ids: [original.id] }), userId);
      assert.equal(result.status, 409);
      assert.match(result.data.error, /active record/);
      assert.equal(await count(), 2);
    });

    await t.test("a newer void requires confirmation again and preserves the correction chain", async () => {
      await voidPayment(corrected.id);
      const stale = await insertPayment(pool, body("1000000", 10, { acknowledged_voided_ids: [original.id] }), userId);
      assert.equal(stale.status, 409);
      assert.deepEqual(stale.data.voided_records.map((row) => row.id), [original.id, corrected.id]);
      assert.equal(await count(), 2);
      const result = await insertPayment(pool, body("1000000", 10, { acknowledged_voided_ids: [original.id, corrected.id] }), userId);
      assert.equal(result.status, 201);
      assert.deepEqual(result.data.correction_of_ids, [original.id, corrected.id]);
      assert.deepEqual((await get(corrected.id)).correction_of_ids, [original.id]);
      assert.deepEqual((await get(corrected.id)).replacement_ids, [result.data.id]);
    });

    let joined;
    await t.test("partial overlaps with two separate voided ranges link both originals", async () => {
      const a = await insertPayment(pool, body("2000000", 5), userId);
      const b = await insertPayment(pool, body("2000005", 5), userId);
      await voidPayment(a.data.id); await voidPayment(b.data.id);
      const result = await insertPayment(pool, body("2000002", 5, { acknowledged_voided_ids: [a.data.id, b.data.id] }), userId);
      assert.equal(result.status, 201);
      joined = result.data;
      assert.deepEqual(joined.correction_of_ids, [a.data.id, b.data.id]);
    });

    await t.test("a failed link write rolls back the payment insert too", async () => {
      await voidPayment(joined.id);
      const before = await count();
      const realConnection = await pool.getConnection();
      const failingPool = { getConnection: async () => new Proxy(realConnection, {
        get(target, property) {
          if (property === "query") return async (sql, values) => {
            if (sql.startsWith("INSERT INTO payment_corrections")) throw new Error("Simulated link failure");
            return target.query(sql, values);
          };
          return Reflect.get(target, property);
        },
      }) };
      await assert.rejects(() => insertPayment(failingPool, body("2000002", 5, {
        acknowledged_voided_ids: [...joined.correction_of_ids, joined.id],
      }), userId), /Simulated link failure/);
      assert.equal(await count(), before);
      assert.deepEqual((await get(joined.id)).replacement_ids, []);
    });
  } finally {
    // Closing the session automatically removes temporary tables and their data.
    await conn.end();
  }
});
