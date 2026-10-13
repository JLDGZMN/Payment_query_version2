import type { RowDataPacket } from "mysql2";

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
