"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { generateOtp } from "@/lib/otp";

// Status-only probe for the live tracker's poll loop. Deliberately the narrowest
// possible read: the poller used to re-render the whole server component every few
// seconds just to notice a status change, which re-ran the page's full ticket +
// site-name query and shipped a fresh RSC payload each time. Now the page only
// re-renders when this reports an actual change.
export async function getGuestTicketStatus(token: string): Promise<string | null> {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("valet_tickets")
    .select("status")
    .eq("ticket_token", token)
    .single();

  return data?.status ?? null;
}

// Public, unauthenticated action -- the ticket_token itself (a 32-char random hex
// string, see checkInVehicle in the Parking Admin queue actions) is the only "auth"
// here, same trust model as any bearer-link guest tracker.
export async function requestVehicleByGuest(token: string) {
  const supabase = createServiceClient();

  const { data: ticket } = await supabase
    .from("valet_tickets")
    .select("id, status, qr_code_id")
    .eq("ticket_token", token)
    .single();

  if (!ticket || ticket.status !== "parked") return;

  await supabase
    .from("valet_tickets")
    .update({
      status: "requested",
      requested_at: new Date().toISOString(),
      otp: ticket.qr_code_id ? null : generateOtp(),
    })
    .eq("id", ticket.id);

  revalidatePath(`/track/${token}`);
}
