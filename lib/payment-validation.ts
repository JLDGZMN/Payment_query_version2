const RCD_AMOUNT_INTEGER_DIGITS = 10;

export const COLLECTORS = [
  "Lydinar Dastas", "Julio De Guzman", "Ivy Callope", "Carla Buganan",
  "Lacel Centeno", "Rizza Rovira", "Baby Jane De Jesus",
];

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
