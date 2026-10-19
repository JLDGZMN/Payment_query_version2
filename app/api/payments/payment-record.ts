import type { RowDataPacket } from "mysql2";
import type { Pool, PoolConnection } from "mysql2/promise";

export type PaymentRow = RowDataPacket & {
  id: number;
  or_date: string;
  or_no_start: string;
  or_no_end: string;
  pieces: number;
  rcd_amount: number | string;
  collector: string;
  status: "Active" | "Void";
  voided_at: string | null;
  voided_by_user_id: string | null;
  voided_by_name: string | null;
  voided_by_username: string | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  created_by_name: string | null;
  created_by_username: string | null;
  updated_by_name: string | null;
  updated_by_username: string | null;
};

export const PAYMENT_SELECT_SQL = `
  SELECT
    p.id,
    p.or_date,
    p.or_no_start,
    p.or_no_end,
    p.pieces,
    p.rcd_amount,
    p.collector,
    p.status,
    p.voided_at,
    p.voided_by_user_id,
    voider.name AS voided_by_name,
    voider.username AS voided_by_username,
    p.created_at,
    p.updated_at,
    p.created_by_user_id,
    p.updated_by_user_id,
    creator.name AS created_by_name,
    creator.username AS created_by_username,
    updater.name AS updated_by_name,
    updater.username AS updated_by_username
  FROM payments p
  LEFT JOIN \`user\` voider ON voider.id = p.voided_by_user_id
  LEFT JOIN \`user\` creator ON creator.id = p.created_by_user_id
  LEFT JOIN \`user\` updater ON updater.id = p.updated_by_user_id
`;

export function serializePayment(row: PaymentRow) {
  return {
    ...row,
    rcd_amount: Number(row.rcd_amount),
  };
}

// Load both directions from immutable links instead of guessing from O.R. numbers.
export async function serializePayments(rows: PaymentRow[], db: Pool | PoolConnection) {
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const placeholders = ids.map(() => "?").join(",");
  const [links] = await db.execute<(RowDataPacket & { replacement_payment_id: number; voided_payment_id: number })[]>(
    `SELECT replacement_payment_id, voided_payment_id FROM payment_corrections
     WHERE replacement_payment_id IN (${placeholders}) OR voided_payment_id IN (${placeholders})
     ORDER BY replacement_payment_id, voided_payment_id`,
    [...ids, ...ids]
  );
  const originals = new Map<number, number[]>();
  const replacements = new Map<number, number[]>();
  for (const link of links) {
    originals.set(link.replacement_payment_id, [...(originals.get(link.replacement_payment_id) ?? []), link.voided_payment_id]);
    replacements.set(link.voided_payment_id, [...(replacements.get(link.voided_payment_id) ?? []), link.replacement_payment_id]);
  }
  return rows.map((row) => ({
    ...serializePayment(row),
    correction_of_ids: originals.get(row.id) ?? [],
    replacement_ids: replacements.get(row.id) ?? [],
  }));
}
