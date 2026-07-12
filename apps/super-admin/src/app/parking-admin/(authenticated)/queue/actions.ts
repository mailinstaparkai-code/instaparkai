"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { getValetSession } from "@/lib/valet-auth/session";
import { generateOtp } from "@/lib/otp";

const PATH = "/parking-admin/queue";

// This web dashboard is Parking Admin only -- valet_operator is Android-app-only per
// the Phase 2 plan (no web dashboard/config access), so it will call a separate
// /api/valet/* REST API (Phase E) rather than these Server Actions.
async function assertParkingAdmin() {
  const session = await getValetSession();
  if (!session || session.role !== "parking_admin") {
    throw new Error("Parking Admin access required.");
  }
  return session;
}

export async function checkInVehicle(formData: FormData) {
  const vehicle_number = formData.get("vehicle_number")?.toString().trim().toUpperCase();
  const vehicle_type = formData.get("vehicle_type")?.toString() || "car";
  const mobile_number = formData.get("mobile_number")?.toString().trim();
  const slot_id = formData.get("slot_id")?.toString() || null;
  if (!vehicle_number || !mobile_number) return;

  const session = await assertParkingAdmin();
  const supabase = createServiceClient();

  const { error } = await supabase.from("valet_tickets").insert({
    parking_space_id: session.assignedSiteId,
    ticket_token: randomBytes(16).toString("hex"),
    vehicle_number,
    vehicle_type,
    mobile_number,
    slot_id,
    status: "parked",
    checked_in_by: session.accountId,
  });
  if (error) throw new Error(error.message);

  if (slot_id) {
    await supabase.from("slots").update({ status: "occupied" }).eq("id", slot_id);
  }

  revalidatePath(PATH);
  revalidatePath("/parking-admin/dashboard");
}

async function loadTicket(supabase: ReturnType<typeof createServiceClient>, id: string, siteId: string) {
  const { data } = await supabase
    .from("valet_tickets")
    .select("id, status, otp, slot_id, parking_space_id")
    .eq("id", id)
    .eq("parking_space_id", siteId)
    .single();
  return data;
}

export async function requestVehicle(formData: FormData) {
  const id = formData.get("id")?.toString();
  if (!id) return;

  const session = await assertParkingAdmin();
  const supabase = createServiceClient();
  const ticket = await loadTicket(supabase, id, session.assignedSiteId);
  if (!ticket || ticket.status !== "parked") return;

  const { error } = await supabase
    .from("valet_tickets")
    .update({ status: "requested", requested_at: new Date().toISOString(), otp: generateOtp() })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
  revalidatePath("/parking-admin/dashboard");
}

export async function dispatchVehicle(formData: FormData) {
  const id = formData.get("id")?.toString();
  const delivered_by = formData.get("delivered_by")?.toString() || null;
  if (!id) return;

  const session = await assertParkingAdmin();
  const supabase = createServiceClient();
  const ticket = await loadTicket(supabase, id, session.assignedSiteId);
  if (!ticket || ticket.status !== "requested") return;

  const { error } = await supabase
    .from("valet_tickets")
    .update({ status: "in_transit", in_transit_at: new Date().toISOString(), delivered_by })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
  revalidatePath("/parking-admin/dashboard");
}

export async function markArrived(formData: FormData) {
  const id = formData.get("id")?.toString();
  if (!id) return;

  const session = await assertParkingAdmin();
  const supabase = createServiceClient();
  const ticket = await loadTicket(supabase, id, session.assignedSiteId);
  if (!ticket || ticket.status !== "in_transit") return;

  const { error } = await supabase
    .from("valet_tickets")
    .update({ status: "arrived", arrived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
  revalidatePath("/parking-admin/dashboard");
}

export async function completeHandover(formData: FormData) {
  const id = formData.get("id")?.toString();
  const otpEntered = formData.get("otp")?.toString().trim();
  const fareRaw = formData.get("fare_amount")?.toString().trim();
  const payment_collected = formData.get("payment_collected") === "on";
  if (!id || !otpEntered) return;

  const session = await assertParkingAdmin();
  const supabase = createServiceClient();
  const ticket = await loadTicket(supabase, id, session.assignedSiteId);
  if (!ticket || ticket.status !== "arrived") return;
  if (ticket.otp !== otpEntered) throw new Error("Incorrect OTP.");

  const { error } = await supabase
    .from("valet_tickets")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      fare_amount: fareRaw ? Number(fareRaw) : null,
      payment_collected,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  if (ticket.slot_id) {
    await supabase.from("slots").update({ status: "available" }).eq("id", ticket.slot_id);
  }

  revalidatePath(PATH);
  revalidatePath("/parking-admin/dashboard");
}
