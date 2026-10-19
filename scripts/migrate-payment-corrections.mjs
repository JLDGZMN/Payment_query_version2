import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createConnection } from "mysql2/promise";

const env = parseEnv(readFileSync(new URL("../.env", import.meta.url), "utf8"));
const conn = await createConnection(process.env.DATABASE_URL || env.DATABASE_URL);
try {
  await conn.query(readFileSync(new URL("./payment-corrections.sql", import.meta.url), "utf8"));
  console.log("Payment correction links table is ready. Existing payments were preserved.");
} finally {
  await conn.end();
}
