import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getAuth } from "@/lib/auth";
import { getPaymentEditError } from "@/lib/payment-validation";
import { getServerConfigErrorMessage } from "@/lib/server-env";
import { PAYMENT_SELECT_SQL, serializePayment, type PaymentRow } from "../payment-record";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

async function mutatePayment(request: NextRequest, { params }: Context, voidRecord: boolean) {
  const configError = getServerConfigErrorMessage();
  if (configError) return NextResponse.json({ error: configError }, { status: 500 });
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (voidRecord && (body.status !== "Void" || Object.keys(body).length !== 1)) {
    return NextResponse.json({ error: "Only voiding is supported." }, { status: 400 });
  }
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const [savedRows] = await conn.execute<PaymentRow[]>("SELECT * FROM payments WHERE id = ? FOR UPDATE", [id]);
    const saved = savedRows[0];
    if (!saved) {
      await conn.rollback();
      return NextResponse.json({ error: "Payment record not found." }, { status: 404 });
    }
    if (!voidRecord) {
      if (saved.status === "Void") {
        await conn.rollback();
        return NextResponse.json({ error: "Voided records cannot be edited." }, { status: 409 });
      }
      const error = getPaymentEditError(body, saved);
      if (error) {
        await conn.rollback();
        return NextResponse.json({ error }, { status: 400 });
      }
      await conn.execute(
        "UPDATE payments SET or_date=?, rcd_amount=?, collector=?, updated_by_user_id=? WHERE id=? AND status='Active'",
        [body.or_date as string, Number(String(body.rcd_amount).replace(/,/g, "")), body.collector as string, session.user.id, id]
      );
    } else if (saved.status !== "Void") {
      await conn.execute(
        "UPDATE payments SET status='Void', voided_at=CURRENT_TIMESTAMP, voided_by_user_id=?, updated_by_user_id=? WHERE id=?",
        [session.user.id, session.user.id, id]
      );
    }
    const [rows] = await conn.execute<PaymentRow[]>(`${PAYMENT_SELECT_SQL} WHERE p.id = ?`, [id]);
    await conn.commit();
    return NextResponse.json(serializePayment(rows[0]));
  } catch (error) {
    await conn.rollback();
    console.error("Payment update failed", error);
    return NextResponse.json({ error: "Failed to update payment record." }, { status: 500 });
  } finally {
    conn.release();
  }
}

export async function PUT(request: NextRequest, context: Context) {
  return mutatePayment(request, context, false);
}
export async function PATCH(request: NextRequest, context: Context) {
  return mutatePayment(request, context, true);
}
export async function DELETE() {
  return NextResponse.json({ error: "Deletion is disabled. Void the record instead." }, { status: 405, headers: { Allow: "PUT, PATCH" } });
}
