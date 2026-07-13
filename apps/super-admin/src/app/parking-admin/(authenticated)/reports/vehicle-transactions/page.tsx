import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { getValetSession } from "@/lib/valet-auth/session";
import { ReportFilters } from "./components/report-filters";
import { ExportCsvButton } from "./components/export-csv-button";

type OperatorRef = { id: string; username: string; full_name: string | null } | null;

type TicketRow = {
  id: string;
  vehicle_number: string;
  vehicle_type: string;
  checked_in_at: string;
  requested_at: string | null;
  in_transit_at: string | null;
  arrived_at: string | null;
  completed_at: string | null;
  fare_amount: number | null;
  payment_collected: boolean;
  checked_in_operator: OperatorRef;
  requested_operator: OperatorRef;
  dispatched_operator: OperatorRef;
  arrived_operator: OperatorRef;
  delivered_operator: OperatorRef;
};

type TransactionType = "checked_in" | "requested" | "dispatched" | "arrived" | "completed";

type Transaction = {
  key: string;
  type: TransactionType;
  timestamp: string;
  vehicleNumber: string;
  operator: OperatorRef;
  fare: number | null;
  paymentCollected: boolean | null;
};

const TRANSACTION_META: Record<TransactionType, { label: string; color: string }> = {
  checked_in: { label: "Checked In", color: "bg-status-info/15 text-status-info" },
  requested: { label: "Pickup Requested", color: "bg-status-warning/15 text-status-warning" },
  dispatched: { label: "Dispatched", color: "bg-brand-orange/15 text-brand-orange" },
  arrived: { label: "Arrived", color: "bg-status-success/15 text-status-success" },
  completed: { label: "Handover Complete", color: "bg-muted text-muted-foreground" },
};

const TRANSACTION_TYPES = Object.keys(TRANSACTION_META) as TransactionType[];

const MAX_ROWS = 500;

function operatorLabel(operator: OperatorRef): string {
  if (!operator) return "—";
  return operator.full_name || operator.username;
}

function unpivot(ticket: TicketRow): Transaction[] {
  const rows: Transaction[] = [];
  rows.push({
    key: `${ticket.id}-checked_in`,
    type: "checked_in",
    timestamp: ticket.checked_in_at,
    vehicleNumber: ticket.vehicle_number,
    operator: ticket.checked_in_operator,
    fare: null,
    paymentCollected: null,
  });
  if (ticket.requested_at) {
    rows.push({
      key: `${ticket.id}-requested`,
      type: "requested",
      timestamp: ticket.requested_at,
      vehicleNumber: ticket.vehicle_number,
      operator: ticket.requested_operator,
      fare: null,
      paymentCollected: null,
    });
  }
  if (ticket.in_transit_at) {
    rows.push({
      key: `${ticket.id}-dispatched`,
      type: "dispatched",
      timestamp: ticket.in_transit_at,
      vehicleNumber: ticket.vehicle_number,
      operator: ticket.dispatched_operator,
      fare: null,
      paymentCollected: null,
    });
  }
  if (ticket.arrived_at) {
    rows.push({
      key: `${ticket.id}-arrived`,
      type: "arrived",
      timestamp: ticket.arrived_at,
      vehicleNumber: ticket.vehicle_number,
      operator: ticket.arrived_operator,
      fare: null,
      paymentCollected: null,
    });
  }
  if (ticket.completed_at) {
    rows.push({
      key: `${ticket.id}-completed`,
      type: "completed",
      timestamp: ticket.completed_at,
      vehicleNumber: ticket.vehicle_number,
      operator: ticket.delivered_operator,
      fare: ticket.fare_amount,
      paymentCollected: ticket.payment_collected,
    });
  }
  return rows;
}

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
      .select(
        "id, vehicle_number, vehicle_type, checked_in_at, requested_at, in_transit_at, arrived_at, completed_at, fare_amount, payment_collected, " +
          "checked_in_operator:valet_accounts!valet_tickets_checked_in_by_fkey(id, username, full_name), " +
          "requested_operator:valet_accounts!valet_tickets_requested_by_fkey(id, username, full_name), " +
          "dispatched_operator:valet_accounts!valet_tickets_dispatched_by_fkey(id, username, full_name), " +
          "arrived_operator:valet_accounts!valet_tickets_arrived_by_fkey(id, username, full_name), " +
          "delivered_operator:valet_accounts!valet_tickets_delivered_by_fkey(id, username, full_name)"
      )
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
                  {new Date(t.timestamp).toLocaleString()}
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
