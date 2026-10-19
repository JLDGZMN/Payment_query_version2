const RCD_AMOUNT_INTEGER_DIGITS = 10;

export const COLLECTORS = [
  "Juan Dela Cruz",
  "Maria Santos",
  "Jose Reyes",
  "Ana Marie Garcia",
  "Mark Anthony Cruz",
  "John Paul Ramos",
  "Michael Santos",
  "Maria Theresa Garcia",
  "Angelica Reyes",
  "Christian Bautista",
  "Joshua Mendoza",
  "Stephanie Flores",
  "Carlo Miguel Fernandez",
  "Patricia Anne Gonzales",
  "Daniel Joseph Aquino",
];

export function getPaymentInsertError(body: Record<string, unknown>) {
  const fieldError = getPaymentEditError(
    { or_date: body.or_date, rcd_amount: body.rcd_amount, collector: body.collector },
    { or_no_start: "", or_no_end: "", pieces: 0 }
  );
  if (fieldError) return fieldError;
  if (typeof body.or_no_start !== "string" || !/^\d{7}$/.test(body.or_no_start) ||
      typeof body.or_no_end !== "string" || !/^\d{7}$/.test(body.or_no_end)) {
    return "O.R. start and end numbers must be exactly 7 digits.";
  }
  if (typeof body.pieces !== "number" || !Number.isInteger(body.pieces) || body.pieces < 1 || body.pieces > 9999) {
    return "Pieces must be a whole number from 1 to 9,999.";
  }
  if (Number(body.or_no_end) - Number(body.or_no_start) + 1 !== body.pieces) {
    return "O.R. range must match the number of pieces.";
  }
  if (Number(String(body.rcd_amount).replace(/,/g, "")) <= 0) return "RCD amount must be greater than zero.";
  const acknowledged = body.acknowledged_voided_ids;
  if (acknowledged !== undefined && (!Array.isArray(acknowledged) ||
      acknowledged.some((id) => !Number.isSafeInteger(id) || id < 1) || new Set(acknowledged).size !== acknowledged.length)) {
    return "Invalid voided payment acknowledgement.";
  }
  return null;
}

export function getPaymentEditError(body: Record<string, unknown>, saved: { or_no_start: string; or_no_end: string; pieces: number }) {
  const allowed = ["or_date", "rcd_amount", "collector", "or_no_start", "or_no_end", "pieces"];
  if (Object.keys(body).some((key) => !allowed.includes(key))) return "Unsupported payment field.";
  for (const key of ["or_no_start", "or_no_end", "pieces"] as const) {
    if (key in body && body[key] !== saved[key]) return "O.R. numbers and pieces cannot be changed. Void this record and create a new one.";
  }
  if (typeof body.or_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.or_date)) return "Use a valid O.R. date.";
  const date = new Date(`${body.or_date}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== body.or_date) return "Use a valid O.R. date.";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  if (body.or_date > today) return "OR Date cannot be later than today.";
  if (typeof body.collector !== "string" || !COLLECTORS.includes(body.collector)) return "Please select a valid collector.";
  return getRcdAmountValidationError(body.rcd_amount);
}

export const MAX_RCD_AMOUNT_DISPLAY = "9,999,999,999.99";

function normalizeNumericString(value: unknown) {
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.trim().replace(/,/g, "");
  return "";
}

export function getRcdAmountValidationError(value: unknown) {
  const normalized = normalizeNumericString(value);

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return "Use a valid amount with up to 2 decimal places.";
  }

  const [wholePart] = normalized.split(".");
  const normalizedWholePart = wholePart.replace(/^0+(?=\d)/, "");

  if (normalizedWholePart.length > RCD_AMOUNT_INTEGER_DIGITS) {
    return `RCD amount cannot exceed ${MAX_RCD_AMOUNT_DISPLAY}.`;
  }

  return null;
}
