"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { getValetSession } from "@/lib/valet-auth/session";
import { generateOtp } from "@/lib/otp";
import { BUCKET, uploadTicketPhotos } from "@/lib/valet-photos";
import { fireTrigger } from "@/lib/communication-triggers";
import { getAvailableOperators } from "@/lib/operator-availability";
import { TICKET_TIMELINE_SELECT, unpivot, type TicketRow, type Transaction } from "@/lib/ticket-timeline";
import { notify } from "@/lib/valet-notifications";

async function getBaseUrl() {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  return `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
}

async function getSiteName(supabase: ReturnType<typeof createServiceClient>, siteId: string) {
  const { data } = await supabase.from("parking_spaces").select("name").eq("id", siteId).single();
  return data?.name ?? "Valet parking";
}

async function isAutoAllocateEnabled(supabase: ReturnType<typeof createServiceClient>, siteId: string) {
  const { data } = await supabase
    .from("parking_spaces")
    .select("auto_allocate_operator")
    .eq("id", siteId)
    .single();
  return data?.auto_allocate_operator ?? false;
}

// Shared by the manual dispatch picker and auto-allocation -- moves a "requested"
// ticket to "in_transit" under the given operator and fires the guest-facing trigger.
async function dispatchToOperator(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string,
  ticket: { id: string; vehicle_number: string; mobile_number: string; ticket_token: string },
  operatorId: string
) {
  const { error } = await supabase
    .from("valet_tickets")
    .update({
      status: "in_transit",
      in_transit_at: new Date().toISOString(),
      dispatched_by: operatorId,
    })
    .eq("id", ticket.id);
  if (error) throw new Error(error.message);

  const siteName = await getSiteName(supabase, siteId);
  await fireTrigger({
    supabase,
    siteId,
    triggerKey: "vehicle_in_transit",
    ticketId: ticket.id,
    mobileNumber: ticket.mobile_number,
    variables: {
      vehicleNumber: ticket.vehicle_number,
      siteName,
      trackingUrl: `${await getBaseUrl()}/track/${ticket.ticket_token}`,
    },
  });
  await notify({
    supabase,
    siteId,
    ticketId: ticket.id,
    kind: "vehicle_dispatched",
    message: `${ticket.vehicle_number} dispatched to an operator`,
  });
}

const CHECKIN_PHOTO_FIELDS = [
  { name: "photo_front", label: "front" },
  { name: "photo_back", label: "back" },
  { name: "photo_left", label: "left" },
  { name: "photo_right", label: "right" },
  { name: "photo_odometer", label: "odometer" },
];

const PATH = "/parking-admin/queue";

// Live Queue is the day-to-day work surface for both roles -- parking_admin and
// valet_operator can both run the ticket lifecycle here. Account management
// (operators/actions.ts) and Communication settings (communication/actions.ts) stay
// gated to parking_admin only via their own assertParkingAdmin().
async function assertValetStaff() {
  const session = await getValetSession();
  if (!session || (session.role !== "parking_admin" && session.role !== "valet_operator")) {
    throw new Error("Sign-in required.");
  }
  return session;
}

async function assertParkingAdmin() {
  const session = await getValetSession();
  if (!session || session.role !== "parking_admin") {
    throw new Error("Parking Admin access required.");
  }
  return session;
}

export async function updateAutoAllocate(formData: FormData) {
  const enabled = formData.get("auto_allocate_operator") === "on";
  const session = await assertParkingAdmin();
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("parking_spaces")
    .update({ auto_allocate_operator: enabled })
    .eq("id", session.assignedSiteId);
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
}

export async function checkInVehicle(formData: FormData) {
  const vehicle_number = formData.get("vehicle_number")?.toString().trim().toUpperCase();
  const vehicle_type = formData.get("vehicle_type")?.toString() || "car";
  const mobile_number = formData.get("mobile_number")?.toString().trim();
  if (!vehicle_number || !mobile_number) return;

  const session = await assertValetStaff();
  const supabase = createServiceClient();

  const ticketId = randomUUID();
  const photos = await uploadTicketPhotos(
    supabase,
    session.assignedSiteId,
    ticketId,
    "checkin",
    formData,
    CHECKIN_PHOTO_FIELDS
  );

  const ticketToken = randomBytes(16).toString("hex");
  // Slot assignment happens later, when the operator has actually parked the car
  // (see markAsParked) -- check-in only covers arrival at reception.
  const { error } = await supabase.from("valet_tickets").insert({
    id: ticketId,
    parking_space_id: session.assignedSiteId,
    ticket_token: ticketToken,
    vehicle_number,
    vehicle_type,
    mobile_number,
    status: "checked_in",
    checked_in_by: session.accountId,
    check_in_photos: photos,
  });
  if (error) throw new Error(error.message);

  const siteName = await getSiteName(supabase, session.assignedSiteId);
  await fireTrigger({
    supabase,
    siteId: session.assignedSiteId,
    triggerKey: "vehicle_checked_in",
    ticketId,
    mobileNumber: mobile_number,
    variables: {
      vehicleNumber: vehicle_number,
      vehicleType: vehicle_type,
      mobileNumber: mobile_number,
      siteName,
      trackingUrl: `${await getBaseUrl()}/track/${ticketToken}`,
    },
  });
  await notify({
    supabase,
    siteId: session.assignedSiteId,
    ticketId,
    kind: "vehicle_checked_in",
    message: `${vehicle_number} checked in`,
  });

  revalidatePath(PATH);
  revalidatePath("/parking-admin/dashboard");
}

export async function markAsParked(formData: FormData) {
  const id = formData.get("id")?.toString();
  const slot_id = formData.get("slot_id")?.toString();
  if (!id || !slot_id) return;

  const session = await assertValetStaff();
  const supabase = createServiceClient();
  const ticket = await loadTicket(supabase, id, session.assignedSiteId);
  if (!ticket || ticket.status !== "checked_in") return;

  const { error } = await supabase
    .from("valet_tickets")
    .update({
      status: "parked",
      slot_id,
      parked_at: new Date().toISOString(),
      parked_by: session.accountId,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await supabase.from("slots").update({ status: "occupied" }).eq("id", slot_id);

  await notify({
    supabase,
    siteId: session.assignedSiteId,
    ticketId: id,
    kind: "vehicle_parked",
    message: `${ticket.vehicle_number} parked`,
  });

  revalidatePath(PATH);
  revalidatePath("/parking-admin/dashboard");
}

export async function getTicketPhotoUrls(ticketId: string) {
  const session = await assertValetStaff();
  const supabase = createServiceClient();

  const { data: ticket } = await supabase
    .from("valet_tickets")
    .select("check_in_photos, handover_photos")
    .eq("id", ticketId)
    .eq("parking_space_id", session.assignedSiteId)
    .single<{
      check_in_photos: { label: string; path: string }[];
      handover_photos: { label: string; path: string }[];
    }>();
  if (!ticket) return [];

  const all = [
    ...ticket.check_in_photos.map((p) => ({ ...p, stage: "Check-in" })),
    ...ticket.handover_photos.map((p) => ({ ...p, stage: "Handover" })),
  ];

  const signed = await Promise.all(
    all.map(async (photo) => {
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(photo.path, 300);
      return { label: photo.label, stage: photo.stage, url: data?.signedUrl ?? null };
    })
  );

  return signed.filter((p): p is { label: string; stage: string; url: string } => !!p.url);
}

export async function getTicketTimeline(ticketId: string): Promise<Transaction[]> {
  const session = await assertValetStaff();
  const supabase = createServiceClient();

  const { data: ticket } = await supabase
    .from("valet_tickets")
    .select(TICKET_TIMELINE_SELECT)
    .eq("id", ticketId)
    .eq("parking_space_id", session.assignedSiteId)
    .single<TicketRow>();
  if (!ticket) return [];

  return unpivot(ticket).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

async function loadTicket(supabase: ReturnType<typeof createServiceClient>, id: string, siteId: string) {
  const { data } = await supabase
    .from("valet_tickets")
    .select(
      "id, status, otp, slot_id, parking_space_id, vehicle_number, vehicle_type, mobile_number, ticket_token"
    )
    .eq("id", id)
    .eq("parking_space_id", siteId)
    .single();
  return data;
}

export async function requestVehicle(formData: FormData) {
  const id = formData.get("id")?.toString();
  if (!id) return;

  const session = await assertValetStaff();
  const supabase = createServiceClient();
  const ticket = await loadTicket(supabase, id, session.assignedSiteId);
  if (!ticket || ticket.status !== "parked") return;

  const { error } = await supabase
    .from("valet_tickets")
    .update({
      status: "requested",
      requested_at: new Date().toISOString(),
      otp: generateOtp(),
      requested_by: session.accountId,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  const siteName = await getSiteName(supabase, session.assignedSiteId);
  await fireTrigger({
    supabase,
    siteId: session.assignedSiteId,
    triggerKey: "pickup_requested",
    ticketId: id,
    mobileNumber: ticket.mobile_number,
    variables: {
      vehicleNumber: ticket.vehicle_number,
      siteName,
      trackingUrl: `${await getBaseUrl()}/track/${ticket.ticket_token}`,
    },
  });
  await notify({
    supabase,
    siteId: session.assignedSiteId,
    ticketId: id,
    kind: "vehicle_requested",
    message: `${ticket.vehicle_number} pickup requested`,
  });

  if (await isAutoAllocateEnabled(supabase, session.assignedSiteId)) {
    const available = await getAvailableOperators(supabase, session.assignedSiteId);
    if (available.length > 0) {
      await dispatchToOperator(supabase, session.assignedSiteId, ticket, available[0].id);
    }
    // No operator available right now -- ticket stays "requested"; a manual dispatch
    // (or the next request once someone frees up) can still pick it up from there.
  }

  revalidatePath(PATH);
  revalidatePath("/parking-admin/dashboard");
}

export async function dispatchVehicle(formData: FormData) {
  const id = formData.get("id")?.toString();
  const operator_id = formData.get("operator_id")?.toString();
  if (!id || !operator_id) return;

  const session = await assertValetStaff();
  const supabase = createServiceClient();
  const ticket = await loadTicket(supabase, id, session.assignedSiteId);
  if (!ticket || ticket.status !== "requested") return;

  const { data: operator } = await supabase
    .from("valet_accounts")
    .select("id")
    .eq("id", operator_id)
    .eq("assigned_site_id", session.assignedSiteId)
    .eq("role", "valet_operator")
    .eq("is_active", true)
    .maybeSingle();
  if (!operator) throw new Error("Selected operator is not available.");

  await dispatchToOperator(supabase, session.assignedSiteId, ticket, operator_id);

  revalidatePath(PATH);
  revalidatePath("/parking-admin/dashboard");
}

export async function markArrived(formData: FormData) {
  const id = formData.get("id")?.toString();
  if (!id) return;

  const session = await assertValetStaff();
  const supabase = createServiceClient();
  const ticket = await loadTicket(supabase, id, session.assignedSiteId);
  if (!ticket || ticket.status !== "in_transit") return;

  const { error } = await supabase
    .from("valet_tickets")
    .update({
      status: "arrived",
      arrived_at: new Date().toISOString(),
      arrived_by: session.accountId,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  const siteName = await getSiteName(supabase, session.assignedSiteId);
  await fireTrigger({
    supabase,
    siteId: session.assignedSiteId,
    triggerKey: "vehicle_arrived",
    ticketId: id,
    mobileNumber: ticket.mobile_number,
    variables: {
      vehicleNumber: ticket.vehicle_number,
      siteName,
      otp: ticket.otp ?? "",
      trackingUrl: `${await getBaseUrl()}/track/${ticket.ticket_token}`,
    },
  });
  await notify({
    supabase,
    siteId: session.assignedSiteId,
    ticketId: id,
    kind: "vehicle_arrived",
    message: `${ticket.vehicle_number} has arrived`,
  });

  revalidatePath(PATH);
  revalidatePath("/parking-admin/dashboard");
}

export async function completeHandover(formData: FormData) {
  const id = formData.get("id")?.toString();
  const otpEntered = formData.get("otp")?.toString().trim();
  const fareRaw = formData.get("fare_amount")?.toString().trim();
  const payment_collected = formData.get("payment_collected") === "on";
  if (!id || !otpEntered) return;

  const session = await assertValetStaff();
  const supabase = createServiceClient();
  const ticket = await loadTicket(supabase, id, session.assignedSiteId);
  if (!ticket || ticket.status !== "arrived") return;
  if (ticket.otp !== otpEntered) throw new Error("Incorrect OTP.");

  const handoverPhotos = await uploadTicketPhotos(
    supabase,
    session.assignedSiteId,
    id,
    "handover",
    formData,
    [{ name: "photo_handover", label: "handover" }]
  );

  const { error } = await supabase
    .from("valet_tickets")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      fare_amount: fareRaw ? Number(fareRaw) : null,
      payment_collected,
      handover_photos: handoverPhotos,
      delivered_by: session.accountId,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  if (ticket.slot_id) {
    await supabase.from("slots").update({ status: "available" }).eq("id", ticket.slot_id);
  }

  const siteName = await getSiteName(supabase, session.assignedSiteId);
  await fireTrigger({
    supabase,
    siteId: session.assignedSiteId,
    triggerKey: "handover_complete",
    ticketId: id,
    mobileNumber: ticket.mobile_number,
    variables: {
      vehicleNumber: ticket.vehicle_number,
      siteName,
      fareAmount: fareRaw ?? "0",
      paymentStatus: payment_collected ? "paid" : "pending",
    },
  });
  await notify({
    supabase,
    siteId: session.assignedSiteId,
    ticketId: id,
    kind: "handover_complete",
    message: `${ticket.vehicle_number} handover complete`,
  });

  revalidatePath(PATH);
  revalidatePath("/parking-admin/dashboard");
}
