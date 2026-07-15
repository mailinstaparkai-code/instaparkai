import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { getValetSession } from "@/lib/valet-auth/session";
import {
  TICKET_TIMELINE_SELECT,
  TRANSACTION_META,
  TRANSACTION_TYPES,
  operatorLabel,
  unpivot,
  type TicketRow,
  type TransactionType,
} from "@/lib/ticket-timeline";
import { formatIST } from "@/lib/format-date";
import { ReportFilters } from "./components/report-filters";
import { ExportCsvButton } from "./components/export-csv-button";

const MAX_ROWS = 500;

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export default async function VehicleTransactionReportPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; operator?: string; from?: string; to?: string }>;
}) {
  const session = await getValetSession();
  if (!session) {
    redirect("/parking-admin/login");
  }
  if (session.role !== "parking_admin") {
    redirect("/parking-admin/dashboard");
  }

  const params = await searchParams;
  const defaults = defaultDateRange();
  const from = params.from || defaults.from;
  const to = params.to || defaults.to;
  const type = TRANSACTION_TYPES.includes(params.type as TransactionType)
    ? (params.type as TransactionType)
    : "all";
  const operatorFilter = params.operator || "all";

  const supabase = createServiceClient();

  const [{ data: tickets }, { data: operatorAccounts }] = await Promise.all([
    supabase
      .from("valet_tickets")
      .select(TICKET_TIMELINE_SELECT)
      .eq("parking_space_id", session.assignedSiteId)
      .gte("checked_in_at", `${from}T00:00:00`)
      .lte("checked_in_at", `${to}T23:59:59`)
      .order("checked_in_at", { ascending: false })
      .returns<TicketRow[]>(),
    supabase
      .from("valet_accounts")
      .select("id, username, full_name")
      .eq("assigned_site_id", session.assignedSiteId)
      .order("username"),
  ]);

  let transactions = (tickets ?? []).flatMap(unpivot);

  if (type !== "all") {
    transactions = transactions.filter((t) => t.type === type);
  }
  if (operatorFilter !== "all") {
    transactions = transactions.filter((t) => t.operator?.id === operatorFilter);
  }

  transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const shown = transactions.slice(0, MAX_ROWS);

  const checkIns = shown.filter((t) => t.type === "checked_in").length;
  const handovers = shown.filter((t) => t.type === "completed").length;
  const activeOperators = new Set(
    shown.filter((t) => t.operator).map((t) => t.operator!.id)
  ).size;

  const operatorOptions = (operatorAccounts ?? []).map((o) => ({
    id: o.id,
    label: o.full_name || o.username,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/parking-admin/reports"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          All Reports
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Vehicle Transaction Report</h1>
        <p className="text-sm text-muted-foreground">
          Every check-in, pickup, dispatch, and handover — with timestamps and operator
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="glass-card p-4">
          <p className="font-numeric text-2xl">{shown.length}</p>
          <p className="text-xs text-muted-foreground">Total transactions</p>
        </div>
        <div className="glass-card p-4">
          <p className="font-numeric text-2xl">{checkIns}</p>
          <p className="text-xs text-muted-foreground">Check-ins</p>
        </div>
        <div className="glass-card p-4">
          <p className="font-numeric text-2xl">{handovers}</p>
          <p className="text-xs text-muted-foreground">Handovers completed</p>
        </div>
        <div className="glass-card p-4">
          <p className="font-numeric text-2xl">{activeOperators}</p>
          <p className="text-xs text-muted-foreground">Active operators</p>
        </div>
      </div>

      <ReportFilters
        operators={operatorOptions}
        type={type}
        operator={operatorFilter}
        from={from}
        to={to}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {shown.length} row(s){transactions.length > MAX_ROWS && ` (capped at ${MAX_ROWS} — narrow the date range for more)`}
        </p>
        <ExportCsvButton
          rows={shown.map((t) => ({
            timestamp: t.timestamp,
            vehicleNumber: t.vehicleNumber,
            label: TRANSACTION_META[t.type].label,
            operatorLabel: operatorLabel(t.operator),
            fare: t.fare,
            paymentCollected: t.paymentCollected,
          }))}
        />
      </div>

      <div className="glass-card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="p-3 font-medium">Timestamp</th>
              <th className="p-3 font-medium">Vehicle</th>
              <th className="p-3 font-medium">Transaction</th>
              <th className="p-3 font-medium">Operator</th>
              <th className="p-3 font-medium">Fare / Payment</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((t) => (
              <tr key={t.key} className="border-b border-border last:border-0">
                <td className="p-3 text-xs text-muted-foreground">
                  {formatIST(t.timestamp)}
                </td>
                <td className="p-3 font-medium">{t.vehicleNumber}</td>
                <td className="p-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${TRANSACTION_META[t.type].color}`}
                  >
                    {TRANSACTION_META[t.type].label}
                  </span>
                </td>
                <td className="p-3 text-xs text-muted-foreground">{operatorLabel(t.operator)}</td>
                <td className="p-3">
                  {t.fare !== null ? (
                    <>
                      <span className="font-numeric">₹{t.fare}</span>{" "}
                      <span
                        className={t.paymentCollected ? "text-status-success" : "text-status-warning"}
                      >
                        {t.paymentCollected ? "paid" : "pending"}
                      </span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {!shown.length && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">
                  No transactions for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
