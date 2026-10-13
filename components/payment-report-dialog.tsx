"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { COLLECTORS } from "@/lib/payment-validation";
import { createPaymentReport, getReportSelectionError, type PaymentReport, type ReportPayment, type ReportSelection, type ReportType } from "@/lib/payment-report";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00Z`));
}

function money(value: number) {
  return value.toLocaleString("en-PH", { style: "currency", currency: "PHP" });
}

function PaymentReportPage({ report }: { report: PaymentReport }) {
  const isVoid = report.selection.reportType === "void";
  const headings = ["O.R. Date", "O.R. No. Start", "O.R. No. End", "Pieces", "RCD Amount", "Collector", ...(isVoid ? ["Status", "Voided at", "Voided by"] : [])];
  const widths = isVoid ? [11, 11, 11, 7, 14, 13, 6, 13, 14] : [16, 17, 17, 10, 19, 21];
  return (
    <article className="report-page mx-auto flex min-h-[186mm] w-full max-w-[273mm] flex-col bg-white p-6 text-slate-950 shadow-sm sm:p-8">
      <header className="report-heading border-b-2 border-slate-800 pb-4">
        <p className="text-xs font-semibold uppercase tracking-widest">Payment Query Portal</p>
        <h2 className="mt-1 text-2xl font-bold">{isVoid ? "Void O.R. Report" : "Payment Collection Report"}</h2>
        <div className="mt-3 space-y-1 text-sm">{report.filters.map((filter) => <p key={filter}>{filter}</p>)}</div>
      </header>
      <table className="report-table mt-5 w-full table-fixed border-collapse text-[12px]">
        <colgroup>{widths.map((width, index) => <col key={headings[index]} style={{ width: `${width}%` }} />)}</colgroup>
        <thead>
          <tr>{headings.map((label) => <th key={label} scope="col" className="border border-slate-400 bg-slate-50 px-2 py-2 text-left font-semibold">{label}</th>)}</tr>
        </thead>
        <tbody>
          {report.records.length === 0 ? <tr><td colSpan={headings.length} className="border border-slate-400 p-6 text-center">No {isVoid ? "voided" : "active"} records match the selected dates and collector.</td></tr> : report.records.map((payment) => (
            <tr key={payment.id}>
              <td className="border border-slate-400 px-2 py-2">{formatDate(payment.or_date)}</td>
              <td className="border border-slate-400 px-2 py-2 break-words">{payment.or_no_start}</td>
              <td className="border border-slate-400 px-2 py-2 break-words">{payment.or_no_end}</td>
              <td className="border border-slate-400 px-2 py-2 text-right">{payment.pieces.toLocaleString()}</td>
              <td className="border border-slate-400 px-2 py-2 text-right break-words">{money(Number(payment.rcd_amount))}</td>
              <td className="border border-slate-400 px-2 py-2 break-words">{payment.collector}</td>
              {isVoid && <>
                <td className="border border-slate-400 px-2 py-2">Void</td>
                <td className="border border-slate-400 px-2 py-2">{payment.voided_at ? new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" }).format(new Date(payment.voided_at)) : "Not available"}</td>
                <td className="border border-slate-400 px-2 py-2 break-words">{payment.voided_by_name || payment.voided_by_username || payment.voided_by_user_id || "Not available"}</td>
              </>}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="report-ending flex flex-1 flex-col">
        <div className="report-summary mt-3 border-b border-slate-300 pb-4 text-sm font-semibold">
          <div className="flex flex-wrap justify-between gap-2">
            <span>{isVoid ? "Voided records" : "Total records"}: {report.records.length.toLocaleString()}</span>
            <span>{isVoid ? "Voided pieces" : "Total pieces"}: {report.totalPieces.toLocaleString()}</span>
            <span>{isVoid ? "Voided amount" : "Total amount"}: {money(report.totalAmount)}</span>
          </div>
        </div>
        <footer className="report-signature mt-auto pt-12 text-xs">
          <div className="w-64 max-w-full border-t border-slate-800 pt-2">
            <p className="font-semibold">{report.preparedBy}</p>
            <p>Prepared by / Signature</p>
          </div>
          <p className="mt-4 text-slate-600">Generated: {new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" }).format(new Date(report.generatedAt))} (Philippine time)</p>
        </footer>
      </div>
    </article>
  );
}

export function PaymentReportDialog({ payments, preparedBy, onClose }: { payments: ReportPayment[]; preparedBy: string; onClose: () => void }) {
  const [selection, setSelection] = useState<ReportSelection>({ reportType: "collection", from: "", to: "", collector: "" });
  const [report, setReport] = useState<PaymentReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const collectors = Array.from(new Set([...COLLECTORS, ...payments.map((payment) => payment.collector)])).sort();

  function changeSelection(change: Partial<ReportSelection>) {
    setSelection((prev) => ({ ...prev, ...change }));
    setError(null);
    setReport(null);
  }

  function preview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = getReportSelectionError(selection);
    setError(validationError);
    if (!validationError) setReport(createPaymentReport(payments, selection, preparedBy));
  }

  return (
    <>
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="payment-report flex max-h-[92vh] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-6xl" showCloseButton={false}>
        <div className="report-screen-only shrink-0 border-b border-border p-5">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Print Report</DialogTitle>
            <DialogDescription>Choose your report dates and collector, then preview. These choices are independent of the Payments table filters.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-1">
            <Label htmlFor="report-type">Report Type</Label>
            <Select value={selection.reportType} onValueChange={(value) => changeSelection({ reportType: value as ReportType })}>
              <SelectTrigger id="report-type" className="w-60 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="collection">Collection Report</SelectItem>
                <SelectItem value="void">Void Report</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{selection.reportType === "void" ? "Filter by the date voided (Philippine time). Voided totals are separate from collections." : "Filter by O.R. date. Only active records are included."}</p>
          </div>
          <form onSubmit={preview} className="mt-4 flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="report-from">From</Label>
              <Input id="report-from" type="date" required value={selection.from} onChange={(event) => changeSelection({ from: event.target.value })} aria-describedby={error ? "report-error" : undefined} className="w-44 rounded-xl" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="report-to">To</Label>
              <Input id="report-to" type="date" required value={selection.to} onChange={(event) => changeSelection({ to: event.target.value })} aria-describedby={error ? "report-error" : undefined} className="w-44 rounded-xl" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="report-collector">Collector</Label>
              <Select value={selection.collector || "all"} onValueChange={(value) => changeSelection({ collector: value === "all" ? "" : value })}>
                <SelectTrigger id="report-collector" className="w-52 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All collectors</SelectItem>
                  {collectors.map((collector) => <SelectItem key={collector} value={collector}>{collector}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="rounded-xl">Preview Report</Button>
          </form>
          {error && <p id="report-error" role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
        </div>

        <div className="report-preview min-h-0 flex-1 overflow-auto bg-slate-100 p-4 sm:p-6">
          {report ? (
            <PaymentReportPage report={report} />
          ) : <div className="flex min-h-52 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">Choose From and To dates, then click Preview Report to view the complete report.</div>}
        </div>

        <div className="report-screen-only flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
          <p className="text-xs text-muted-foreground">A4 landscape. {selection.reportType === "void" ? "Only matching voided records are included." : "Only matching active records are included."}</p>
          <div className="flex gap-2">
            <Button variant="ghost" className="rounded-xl" onClick={onClose}>Close</Button>
            <Button className="rounded-xl" onClick={() => window.print()} disabled={!report?.records.length}>Print / Save as PDF</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    {report && createPortal(<div className="payment-report-print" aria-hidden="true"><PaymentReportPage report={report} /></div>, document.body)}
    </>
  );
}
