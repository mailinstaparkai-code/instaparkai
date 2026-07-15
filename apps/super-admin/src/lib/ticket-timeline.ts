export type OperatorRef = { id: string; username: string; full_name: string | null } | null;

export type TicketRow = {
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

export type TransactionType = "checked_in" | "requested" | "dispatched" | "arrived" | "completed";

export type Transaction = {
  key: string;
  type: TransactionType;
  timestamp: string;
  vehicleNumber: string;
  operator: OperatorRef;
  fare: number | null;
  paymentCollected: boolean | null;
};

export const TRANSACTION_META: Record<TransactionType, { label: string; color: string }> = {
  checked_in: { label: "Checked In", color: "bg-status-info/15 text-status-info" },
  requested: { label: "Pickup Requested", color: "bg-status-warning/15 text-status-warning" },
  dispatched: { label: "Dispatched", color: "bg-brand-orange/15 text-brand-orange" },
  arrived: { label: "Arrived", color: "bg-status-success/15 text-status-success" },
  completed: { label: "Handover Complete", color: "bg-muted text-muted-foreground" },
};

export const TRANSACTION_TYPES = Object.keys(TRANSACTION_META) as TransactionType[];

// Every operator-embed field this shape needs, in the exact PostgREST syntax used at
// every call site -- kept in one place so the report and the per-ticket timeline never
// drift out of sync on which columns/joins they select.
export const TICKET_TIMELINE_SELECT =
  "id, vehicle_number, vehicle_type, checked_in_at, requested_at, in_transit_at, arrived_at, completed_at, fare_amount, payment_collected, " +
  "checked_in_operator:valet_accounts!valet_tickets_checked_in_by_fkey(id, username, full_name), " +
  "requested_operator:valet_accounts!valet_tickets_requested_by_fkey(id, username, full_name), " +
  "dispatched_operator:valet_accounts!valet_tickets_dispatched_by_fkey(id, username, full_name), " +
  "arrived_operator:valet_accounts!valet_tickets_arrived_by_fkey(id, username, full_name), " +
  "delivered_operator:valet_accounts!valet_tickets_delivered_by_fkey(id, username, full_name)";

export function operatorLabel(operator: OperatorRef): string {
  if (!operator) return "—";
  return operator.full_name || operator.username;
}

export function unpivot(ticket: TicketRow): Transaction[] {
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
