import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getAuth, type Auth } from "@/lib/auth";
import { getServerConfigErrorMessage } from "@/lib/server-env";
import { PAYMENT_SELECT_SQL, serializePayments, type PaymentRow } from "./payment-record";

import { insertPayment } from "./insert-payment";

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

  const payments = await serializePayments(rows, pool);

  return NextResponse.json(payments);
}

export async function POST(request: NextRequest) {
  const configError = getConfigErrorResponse();
  if (configError) return configError;

  const session = await requireSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  try {
    const result = await insertPayment(getPool(), body, session.user.id);
    return NextResponse.json(result.data, { status: result.status });
  } catch {
    return NextResponse.json({ error: "Unable to save payment. Please try again." }, { status: 500 });
  }
}
