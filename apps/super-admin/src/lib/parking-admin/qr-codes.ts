import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { ValetSession } from "@/lib/valet-auth/session";
import { assertParkingAdminRole, ACTIVE_STATUSES } from "./queue";
import { AppError } from "./errors";

export type QrCode = { id: string; code: string; created_at: string };
export type QrCodeStatus = QrCode & {
  inUse: boolean;
  ticket: { id: string; vehicle_number: string; status: string } | null;
};

const CODE_PREFIX = "IPK-";

// Codes are globally unique (see migration), not scoped per site -- the guest-facing
// scan URL (/track/qr/<code>) has no site context, so numbering is one counter shared
// across every site. Batch admin action, not hot-path: a plain max-then-insert is fine
// given this repo's "tables are tiny" performance philosophy, no Postgres sequence needed.
export async function generateQrCodes(
  supabase: ReturnType<typeof createServiceClient>,
  session: ValetSession,
  count: number
): Promise<QrCode[]> {
  assertParkingAdminRole(session);
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    throw new AppError("invalid_request", "Count must be between 1 and 100.", 400);
  }

  const { data: last } = await supabase
    .from("qr_codes")
    .select("code")
    .order("code", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastNumber = last ? Number(last.code.slice(CODE_PREFIX.length)) || 0 : 0;

  const rows = Array.from({ length: count }, (_, i) => ({
    site_id: session.assignedSiteId,
    code: `${CODE_PREFIX}${String(lastNumber + i + 1).padStart(4, "0")}`,
  }));

  const { data, error } = await supabase.from("qr_codes").insert(rows).select("id, code, created_at");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listQrCodes(
  supabase: ReturnType<typeof createServiceClient>,
  session: ValetSession
): Promise<QrCodeStatus[]> {
  assertParkingAdminRole(session);

  const { data: codes } = await supabase
    .from("qr_codes")
    .select("id, code, created_at")
    .eq("site_id", session.assignedSiteId)
    .order("code", { ascending: false });
  if (!codes?.length) return [];

  const { data: activeTickets } = await supabase
    .from("valet_tickets")
    .select("id, vehicle_number, status, qr_code_id")
    .in(
      "qr_code_id",
      codes.map((c) => c.id)
    )
    .in("status", ACTIVE_STATUSES as unknown as string[]);

  const byQrCodeId = new Map(
    (activeTickets ?? []).map((t) => [t.qr_code_id as string, t])
  );

  return codes.map((c) => {
    const ticket = byQrCodeId.get(c.id) ?? null;
    return {
      ...c,
      inUse: !!ticket,
      ticket: ticket ? { id: ticket.id, vehicle_number: ticket.vehicle_number, status: ticket.status } : null,
    };
  });
}

// Used only by /track/qr/[code]. Global lookup -- codes are globally unique.
export async function resolveActiveTicketByQrCode(
  supabase: ReturnType<typeof createServiceClient>,
  code: string
): Promise<{ id: string; ticket_token: string } | null> {
  const { data: qrCode } = await supabase.from("qr_codes").select("id").eq("code", code).maybeSingle();
  if (!qrCode) return null;

  const { data: ticket } = await supabase
    .from("valet_tickets")
    .select("id, ticket_token")
    .eq("qr_code_id", qrCode.id)
    .in("status", ACTIVE_STATUSES as unknown as string[])
    .maybeSingle();
  return ticket ?? null;
}

export async function setGuestRequestMode(
  supabase: ReturnType<typeof createServiceClient>,
  session: ValetSession,
  mode: "link" | "qr"
): Promise<void> {
  assertParkingAdminRole(session);
  const { error } = await supabase
    .from("parking_spaces")
    .update({ guest_request_mode: mode })
    .eq("id", session.assignedSiteId);
  if (error) throw new Error(error.message);
}
