import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getAuth, type Auth } from "@/lib/auth";
import { getRcdAmountValidationError } from "@/lib/payment-validation";
import { getServerConfigErrorMessage } from "@/lib/server-env";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { PAYMENT_SELECT_SQL, serializePayment, type PaymentRow } from "./payment-record";

export const runtime = "nodejs";
type Session = Auth["$Infer"]["Session"];

function getConfigErrorResponse() {
  const error = getServerConfigErrorMessage();

  if (!error) {
    return null;
  }

  return NextResponse.json({ error }, { status: 500 });
}

async function requireSession(request: NextRequest): Promise<Session | null> {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return null;
  return session;
}

export async function GET(request: NextRequest) {
  const configError = getConfigErrorResponse();
  if (configError) return configError;

  if (!await requireSession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pool = getPool();
  const [rows] = await pool.execute<PaymentRow[]>(
    `${PAYMENT_SELECT_SQL}
     ORDER BY p.or_date DESC, p.id DESC`
  );

  const payments = rows.map(serializePayment);

  return NextResponse.json(payments);
}

export async function POST(request: NextRequest) {
  const configError = getConfigErrorResponse();
  if (configError) return configError;

  const session = await requireSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pool = getPool();
  const body = await request.json();
  const { or_date, or_no_start, or_no_end, pieces, rcd_amount, collector } = body;

  if (!or_date || !or_no_start || !or_no_end || !pieces || !rcd_amount || !collector) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  const rcdAmountError = getRcdAmountValidationError(rcd_amount);
  if (rcdAmountError) {
    return NextResponse.json({ error: rcdAmountError }, { status: 400 });
  }

  const start = parseInt(or_no_start);
  const end = parseInt(or_no_end);
  if (isNaN(start) || isNaN(end) || start > end) {
    return NextResponse.json({ error: "Invalid O.R. number range." }, { status: 400 });
  }

  const [conflicts] = await pool.execute<RowDataPacket[]>(
    `SELECT id, or_no_start, or_no_end FROM payments
     WHERE CAST(or_no_start AS UNSIGNED) <= CAST(? AS UNSIGNED)
       AND CAST(or_no_end   AS UNSIGNED) >= CAST(? AS UNSIGNED)
     LIMIT 1`,
    [end, start]
  );

  if (conflicts.length > 0) {
    const c = conflicts[0];
    return NextResponse.json(
      { error: `O.R. range overlaps with an existing record (${c.or_no_start}-${c.or_no_end}).` },
      { status: 409 }
    );
  }

  const [result] = await pool.execute<ResultSetHeader>(
    "INSERT INTO `payments` (`or_date`, `or_no_start`, `or_no_end`, `pieces`, `rcd_amount`, `collector`, `created_by_user_id`, `updated_by_user_id`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [or_date, or_no_start, or_no_end, pieces, rcd_amount, collector, session.user.id, session.user.id]
  );

  const [rows] = await pool.execute<PaymentRow[]>(
    `${PAYMENT_SELECT_SQL}
     WHERE p.id = ?`,
    [result.insertId]
  );

  const row = rows[0];
  return NextResponse.json(serializePayment(row), { status: 201 });
}
