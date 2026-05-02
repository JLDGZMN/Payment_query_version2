const RCD_AMOUNT_INTEGER_DIGITS = 10;

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
