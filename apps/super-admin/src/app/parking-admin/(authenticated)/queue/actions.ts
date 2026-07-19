"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { getValetSession } from "@/lib/valet-auth/session";
import * as queueLib from "@/lib/parking-admin/queue";

const PATH = "/parking-admin/queue";

// Live Queue is the day-to-day work surface for both roles -- parking_admin and
// valet_operator can both run the ticket lifecycle here. Account management
// (operators/actions.ts) and Communication settings (communication/actions.ts) stay
// gated to parking_admin only via their own assertParkingAdmin().
async function assertValetStaff() {
  const session = await getValetSession();
  queueLib.assertValetStaffRole(session);
  return session;
}

async function assertParkingAdmin() {
  const session = await getValetSession();
  queueLib.assertParkingAdminRole(session);
  return session;
}

export async function updateAutoAllocate(formData: FormData) {
  const enabled = formData.get("auto_allocate_operator") === "on";
  const session = await assertParkingAdmin();
  const supabase = createServiceClient();

  await queueLib.setAutoAllocate(supabase, session, enabled);

  revalidatePath(PATH);
}

export async function checkInVehicle(formData: FormData) {
  const vehicle_number = formData.get("vehicle_number")?.toString().trim();
  const vehicle_type = formData.get("vehicle_type")?.toString() || "car";
  const mobile_number = formData.get("mobile_number")?.toString().trim();
  if (!vehicle_number || !mobile_number) return;

  const session = await assertValetStaff();
  const supabase = createServiceClient();

  await queueLib.checkInVehicle(
    supabase,
    session,
    { vehicleNumber: vehicle_number, vehicleType: vehicle_type, mobileNumber: mobile_number },
    formData
  );

  revalidatePath(PATH);
  revalidatePath("/parking-admin/dashboard");
}

export async function markAsParked(formData: FormData) {
  const id = formData.get("id")?.toString();
  const slot_id = formData.get("slot_id")?.toString();
  if (!id || !slot_id) return;

  const session = await assertValetStaff();
  const supabase = createServiceClient();

  await queueLib.markAsParked(supabase, session, id, slot_id);

  revalidatePath(PATH);
  revalidatePath("/parking-admin/dashboard");
}

export async function getTicketPhotoUrls(ticketId: string) {
  const session = await assertValetStaff();
  const supabase = createServiceClient();
  return queueLib.getTicketPhotoUrls(supabase, session, ticketId);
}

export async function getTicketTimeline(ticketId: string) {
  const session = await assertValetStaff();
  const supabase = createServiceClient();
  return queueLib.getTicketTimeline(supabase, session, ticketId);
}

export async function requestVehicle(formData: FormData) {
  const id = formData.get("id")?.toString();
  if (!id) return;

  const session = await assertValetStaff();
  const supabase = createServiceClient();

  await queueLib.requestVehicle(supabase, session, id);

  revalidatePath(PATH);
  revalidatePath("/parking-admin/dashboard");
}

export async function dispatchVehicle(formData: FormData) {
  const id = formData.get("id")?.toString();
  const operator_id = formData.get("operator_id")?.toString();
  if (!id || !operator_id) return;

  const session = await assertValetStaff();
  const supabase = createServiceClient();

  await queueLib.dispatchVehicle(supabase, session, id, operator_id);

  revalidatePath(PATH);
  revalidatePath("/parking-admin/dashboard");
}

export async function markArrived(formData: FormData) {
  const id = formData.get("id")?.toString();
  if (!id) return;

  const session = await assertValetStaff();
  const supabase = createServiceClient();

  await queueLib.markArrived(supabase, session, id);

  revalidatePath(PATH);
  revalidatePath("/parking-admin/dashboard");
}

export async function updateTicketDetails(formData: FormData) {
  const id = formData.get("id")?.toString();
  const vehicle_number = formData.get("vehicle_number")?.toString().trim();
  const mobile_number = formData.get("mobile_number")?.toString().trim();
  if (!id || !vehicle_number || !mobile_number) return;

  const session = await assertValetStaff();
  const supabase = createServiceClient();

  await queueLib.updateTicketDetails(supabase, session, id, {
    vehicleNumber: vehicle_number,
    mobileNumber: mobile_number,
  });

  revalidatePath(PATH);
  revalidatePath("/parking-admin/vehicles");
}

export async function voidTicket(formData: FormData) {
  const id = formData.get("id")?.toString();
  const void_reason = formData.get("void_reason")?.toString().trim() || null;
  if (!id) return;

  const session = await assertValetStaff();
  const supabase = createServiceClient();

  await queueLib.voidTicket(supabase, session, id, void_reason);

  revalidatePath(PATH);
  revalidatePath("/parking-admin/dashboard");
  revalidatePath("/parking-admin/vehicles");
}

export async function completeHandover(formData: FormData) {
  const id = formData.get("id")?.toString();
  const otpEntered = formData.get("otp")?.toString().trim();
  const fareRaw = formData.get("fare_amount")?.toString().trim();
  const payment_collected = formData.get("payment_collected") === "on";
  if (!id || !otpEntered) return;

  const session = await assertValetStaff();
  const supabase = createServiceClient();

  await queueLib.completeHandover(
    supabase,
    session,
    id,
    { otp: otpEntered, fareAmount: fareRaw || null, paymentCollected: payment_collected },
    formData
  );

  revalidatePath(PATH);
  revalidatePath("/parking-admin/dashboard");
}
