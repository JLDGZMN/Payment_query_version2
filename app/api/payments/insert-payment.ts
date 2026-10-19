import type { Pool } from "mysql2/promise";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getPaymentInsertError } from "@/lib/payment-validation";
import { PAYMENT_SELECT_SQL, serializePayments, type PaymentRow } from "./payment-record";

export async function insertPayment(pool: Pool, body: Record<string, unknown>, userId: string) {
  const validation = getPaymentInsertError(body);
  if (validation) return { status: 400, data: { error: validation } };

  const { or_date, or_no_start, or_no_end, pieces, rcd_amount, collector } = body;
  const acknowledged = (body.acknowledged_voided_ids ?? []) as number[];
  const conn = await pool.getConnection();
  let locked = false;
  try {
    // Serialize inserts across app instances, including when the table is empty.
    const [locks] = await conn.execute<(RowDataPacket & { acquired: number })[]>(
      "SELECT GET_LOCK('payment_query_insert', 10) AS acquired"
    );
    locked = locks[0]?.acquired === 1;
    if (!locked) return { status: 503, data: { error: "Another payment is being saved. Please try again." } };

    await conn.beginTransaction();
    const [matches] = await conn.execute<PaymentRow[]>(
      `SELECT * FROM payments WHERE CAST(or_no_start AS UNSIGNED) <= ?
       AND CAST(or_no_end AS UNSIGNED) >= ? ORDER BY id FOR UPDATE`,
      [Number(or_no_end), Number(or_no_start)]
    );
    const active = matches.find((row) => row.status === "Active");
    if (active) {
      await conn.rollback();
      return { status: 409, data: { error: `O.R. range overlaps with an existing active record (${active.or_no_start}-${active.or_no_end}).` } };
    }

    const voidedIds = matches.filter((row) => row.status === "Void").map((row) => row.id);
    if (voidedIds.length !== acknowledged.length || voidedIds.some((id) => !acknowledged.includes(id))) {
      const placeholders = voidedIds.map(() => "?").join(",");
      const [voidedRows] = voidedIds.length
        ? await conn.execute<PaymentRow[]>(`${PAYMENT_SELECT_SQL} WHERE p.id IN (${placeholders}) ORDER BY p.id`, voidedIds)
        : [[]];
      const voidedRecords = await serializePayments(voidedRows, conn);
      await conn.rollback();
      return {
        status: 409,
        data: {
          code: "VOID_CONFIRMATION_REQUIRED",
          error: "The voided O.R. matches have changed. Please review the details and confirm again.",
          voided_records: voidedRecords,
        },
      };
    }

    const [result] = await conn.execute<ResultSetHeader>(
      `INSERT INTO payments (or_date, or_no_start, or_no_end, pieces, rcd_amount, collector, created_by_user_id, updated_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [String(or_date), String(or_no_start), String(or_no_end), Number(pieces), Number(String(rcd_amount).replace(/,/g, "")), String(collector), userId, userId]
    );
    if (voidedIds.length) {
      await conn.query(
        "INSERT INTO payment_corrections (replacement_payment_id, voided_payment_id) VALUES ?",
        [voidedIds.map((id) => [result.insertId, id])]
      );
    }
    const [rows] = await conn.execute<PaymentRow[]>(`${PAYMENT_SELECT_SQL} WHERE p.id = ?`, [result.insertId]);
    const [payment] = await serializePayments(rows, conn);
    await conn.commit();
    return { status: 201, data: payment };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    try {
      if (locked) await conn.execute("SELECT RELEASE_LOCK('payment_query_insert')");
    } finally {
      conn.release();
    }
  }
}
