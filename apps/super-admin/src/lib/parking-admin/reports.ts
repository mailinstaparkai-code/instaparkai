import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import {
  TICKET_TIMELINE_SELECT,
  TRANSACTION_TYPES,
  unpivot,
  type TicketRow,
  type Transaction,
  type TransactionType,
} from "@/lib/ticket-timeline";

const MAX_ROWS = 500;
const PAGE_SIZE = 25;

export type VehicleTransactionsResult = {
  transactions: Transaction[];
  page: number;
  totalPages: number;
  totalCount: number;
  cappedAt: number | null;
  stats: { checkIns: number; handovers: number; activeOperators: number };
  operatorOptions: { id: string; label: string }[];
};

// Shared by the web report page (reports/vehicle-transactions/page.tsx) and
// v1/reports/vehicle-transactions -- identical filtering/pagination logic.
export async function getVehicleTransactionsReport(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string,
  filters: { types: string[]; operators: string[]; from: string; to: string },
  page: number
): Promise<VehicleTransactionsResult> {
  const typeFilter = filters.types.filter((t) => TRANSACTION_TYPES.includes(t as TransactionType));

  const [{ data: tickets }, { data: operatorAccounts }] = await Promise.all([
    supabase
      .from("valet_tickets")
      .select(TICKET_TIMELINE_SELECT)
      .eq("parking_space_id", siteId)
      .gte("checked_in_at", `${filters.from}T00:00:00`)
      .lte("checked_in_at", `${filters.to}T23:59:59`)
      .order("checked_in_at", { ascending: false })
      .limit(MAX_ROWS)
      .returns<TicketRow[]>(),
    supabase
      .from("valet_accounts")
      .select("id, username, full_name")
      .eq("assigned_site_id", siteId)
      .order("username"),
  ]);

  let transactions = (tickets ?? []).flatMap(unpivot);
  if (typeFilter.length) {
    transactions = transactions.filter((t) => typeFilter.includes(t.type));
  }
  if (filters.operators.length) {
    transactions = transactions.filter((t) => t.operator && filters.operators.includes(t.operator.id));
  }
  transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const totalCount = transactions.length;
  const capped = transactions.slice(0, MAX_ROWS);
  const totalPages = Math.max(1, Math.ceil(capped.length / PAGE_SIZE));
  const shown = capped.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return {
    transactions: shown,
    page,
    totalPages,
    totalCount,
    cappedAt: totalCount > MAX_ROWS ? MAX_ROWS : null,
    stats: {
      checkIns: capped.filter((t) => t.type === "checked_in").length,
      handovers: capped.filter((t) => t.type === "completed").length,
      activeOperators: new Set(capped.filter((t) => t.operator).map((t) => t.operator!.id)).size,
    },
    operatorOptions: (operatorAccounts ?? []).map((o) => ({
      id: o.id,
      label: o.full_name || o.username,
    })),
  };
}
