"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { generateOtp } from "@/lib/otp";

// Public, unauthenticated action -- the ticket_token itself (a 32-char random hex
// string, see checkInVehicle in the Parking Admin queue actions) is the only "auth"
// here, same trust model as any bearer-link guest tracker.
export async function requestVehicleByGuest(token: string) {
  const supabase = createServiceClient();

  const { data: ticket } = await supabase
    .from("valet_tickets")
    .select("id, status")
    .eq("ticket_token", token)
    .single();

  if (!ticket || ticket.status !== "parked") return;

  await supabase
    .from("valet_tickets")
    .update({ status: "requested", requested_at: new Date().toISOString(), otp: generateOtp() })
    .eq("id", ticket.id);

  revalidatePath(`/track/${token}`);
}
