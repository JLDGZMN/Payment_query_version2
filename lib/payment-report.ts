export type ReportPayment = {
  id: number;
  or_date: string;
  or_no_start: string;
  or_no_end: string;
  pieces: number;
  rcd_amount: number;
  collector: string;
  status: "Active" | "Void";
  voided_at?: string | null;
  voided_by_user_id?: string | null;
  voided_by_name?: string | null;
  voided_by_username?: string | null;
};

export type ReportType = "collection" | "void";
export type ReportSelection = { reportType: ReportType; from: string; to: string; collector: string };

export function getReportSelectionError(selection: ReportSelection) {
  if (selection.reportType !== "collection" && selection.reportType !== "void") return "Choose a valid report type.";
  for (const value of [selection.from, selection.to]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Choose both From and To dates.";
    const date = new Date(`${value}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return "Choose valid report dates.";
  }
  if (selection.from > selection.to) return "From date must be on or before To date.";
  return null;
}

export function getReportDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function createPaymentReport(payments: ReportPayment[], selection: ReportSelection, preparedBy: string) {
  const error = getReportSelectionError(selection);
  if (error) throw new Error(error);
  const isVoid = selection.reportType === "void";
  const records = payments
    .filter((payment) => payment.status === (isVoid ? "Void" : "Active") && (!selection.collector || payment.collector === selection.collector) && (!isVoid || Boolean(payment.voided_at)))
    .map((payment) => ({ ...payment, or_date: getReportDate(payment.or_date), report_date: getReportDate(isVoid ? payment.voided_at! : payment.or_date) }))
    .filter((payment) => payment.report_date >= selection.from && payment.report_date <= selection.to)
    .sort((a, b) => a.report_date.localeCompare(b.report_date) || a.or_no_start.localeCompare(b.or_no_start, "en", { numeric: true }) || a.id - b.id);
  const displayDate = (value: string) => new Intl.DateTimeFormat("en-PH", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00Z`));
  return {
    records,
    selection: { ...selection },
    filters: [`${isVoid ? "Date voided" : "O.R. date"}: ${displayDate(selection.from)} to ${displayDate(selection.to)} (inclusive)`, `Collector: ${selection.collector || "All collectors"}`],
    preparedBy,
    generatedAt: new Date().toISOString(),
    totalPieces: records.reduce((sum, payment) => sum + Number(payment.pieces), 0),
    totalAmount: records.reduce((sum, payment) => sum + Math.round(Number(payment.rcd_amount) * 100), 0) / 100,
  };
}

export type PaymentReport = ReturnType<typeof createPaymentReport>;
