import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

export type NotificationKind =
  | "vehicle_checked_in"
  | "vehicle_parked"
  | "vehicle_requested"
  | "vehicle_dispatched"
  | "vehicle_arrived"
  | "handover_complete"
  | "vehicle_voided";

// Best-effort, never throws -- same guarantee as fireTrigger(), sits right alongside
// it at each lifecycle call site. Site-wide: every parking_admin/valet_operator on the
// site sees it, not just whoever's assigned to the ticket.
export async function notify(args: {
  supabase: ReturnType<typeof createServiceClient>;
  siteId: string;
  ticketId: string;
  kind: NotificationKind;
  message: string;
}): Promise<void> {
  try {
    await args.supabase.from("valet_notifications").insert({
      parking_space_id: args.siteId,
      ticket_id: args.ticketId,
      kind: args.kind,
      message: args.message,
    });
  } catch {
    // best-effort -- never fail the caller's ticket-lifecycle transaction
  }
}
