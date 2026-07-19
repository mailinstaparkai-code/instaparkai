import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import type { createServiceClient } from "@/lib/supabase/service";
import type { ValetSession } from "@/lib/valet-auth/session";
import { generateOtp } from "@/lib/otp";
import { BUCKET, uploadTicketPhotos } from "@/lib/valet-photos";
import { fireTrigger } from "@/lib/communication-triggers";
import { getAvailableOperators } from "@/lib/operator-availability";
import { TICKET_TIMELINE_SELECT, unpivot, type TicketRow, type Transaction } from "@/lib/ticket-timeline";
import { notify } from "@/lib/valet-notifications";
import { type TariffRule } from "@/lib/tariff";
import { AppError } from "./errors";

export const ACTIVE_STATUSES = ["checked_in", "parked", "requested", "in_transit", "arrived"] as const;

export const STATUS_LABEL: Record<string, string> = {
  checked_in: "Checked in",
  parked: "Parked",
  requested: "Requested",
  in_transit: "In transit",
  arrived: "Arrived",
  completed: "Completed",
};

export const CHECKIN_PHOTO_FIELDS = [
  { name: "photo_front", label: "front" },
  { name: "photo_back", label: "back" },
  { name: "photo_left", label: "left" },
  { name: "photo_right", label: "right" },
  { name: "photo_odometer", label: "odometer" },
];

const DAILY_STATUS_BADGE: Record<string, string> = {
  out: "Marked out",
  leave: "On leave",
  break: "On break",
};

export type QueueTicket = {
  id: string;
  ticket_token: string;
  vehicle_number: string;
  vehicle_type: string;
  mobile_number: string;
  status: string;
  checked_in_at: string;
  checked_in_by: string | null;
  fare_amount: number | null;
  check_in_photos: unknown[];
  handover_photos: unknown[];
  slots: { slot_number: string } | null;
};

export function assertValetStaffRole(session: ValetSession | null): asserts session is ValetSession {
  if (!session || (session.role !== "parking_admin" && session.role !== "valet_operator")) {
    throw new AppError("unauthorized", "Sign-in required.", 401);
  }
}

export function assertParkingAdminRole(session: ValetSession | null): asserts session is ValetSession {
  if (!session || session.role !== "parking_admin") {
    throw new AppError("forbidden", "Parking Admin access required.", 403);
  }
}

export async function getBaseUrl() {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  return `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
}

export async function getSiteName(supabase: ReturnType<typeof createServiceClient>, siteId: string) {
  const { data } = await supabase.from("parking_spaces").select("name").eq("id", siteId).single();
  return data?.name ?? "Valet parking";
}

export async function isAutoAllocateEnabled(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string
) {
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

export async function loadTicket(
  supabase: ReturnType<typeof createServiceClient>,
  id: string,
  siteId: string
) {
  const { data } = await supabase
    .from("valet_tickets")
    .select(
      "id, status, otp, slot_id, parking_space_id, vehicle_number, vehicle_type, mobile_number, ticket_token, checked_in_by"
    )
    .eq("id", id)
    .eq("parking_space_id", siteId)
    .single();
  return data;
}

export type QueueData = {
  tickets: QueueTicket[];
  availableSlots: { id: string; label: string }[];
  operatorOptions: { id: string; label: string }[];
  vehicleTypeOptions: { value: string; label: string }[];
  statusOptions: { value: string; label: string }[];
  tariffRules: TariffRule[];
  autoAllocateEnabled: boolean;
  canToggleAutoAllocate: boolean;
  // "Guest requested" and manual dispatch are Parking Admin only; mark-as-parked is
  // the checked-in operator or an admin (evaluated per-ticket, see QueueTicket).
  canRequest: boolean;
  canDispatch: boolean;
  myAccountId: string;
};

export async function getQueueData(
  supabase: ReturnType<typeof createServiceClient>,
  session: ValetSession,
  filters: { status?: string[]; vehicleType?: string[] } = {}
): Promise<QueueData> {
  const statusFilter = (filters.status ?? []).filter((s) =>
    (ACTIVE_STATUSES as readonly string[]).includes(s)
  );
  const vehicleTypeFilter = filters.vehicleType ?? [];

  let ticketsQuery = supabase
    .from("valet_tickets")
    .select(
      "id, ticket_token, vehicle_number, vehicle_type, mobile_number, status, checked_in_at, checked_in_by, fare_amount, check_in_photos, handover_photos, slots(slot_number)"
    )
    .eq("parking_space_id", session.assignedSiteId)
    .in("status", ACTIVE_STATUSES as unknown as string[]);
  if (statusFilter.length) ticketsQuery = ticketsQuery.in("status", statusFilter);
  if (vehicleTypeFilter.length) ticketsQuery = ticketsQuery.in("vehicle_type", vehicleTypeFilter);

  const [
    { data: tickets },
    { data: zones },
    { data: tariffRules },
    { data: site },
    availableOperators,
    { data: vehicleTypes },
  ] = await Promise.all([
    ticketsQuery.order("checked_in_at", { ascending: true }).returns<QueueTicket[]>(),
    supabase
      .from("zones")
      .select("id, name, slots(id, slot_number, status)")
      .eq("parking_space_id", session.assignedSiteId),
    supabase
      .from("tariff_rules")
      .select("vehicle_category, pricing_type, rate, surge_multiplier, slab_tiers")
      .eq("parking_space_id", session.assignedSiteId)
      .returns<TariffRule[]>(),
    supabase
      .from("parking_spaces")
      .select("auto_allocate_operator")
      .eq("id", session.assignedSiteId)
      .single(),
    getAvailableOperators(supabase, session.assignedSiteId, { respectDailyStatus: false }),
    supabase
      .from("vehicle_types")
      .select("id, name")
      .eq("parking_space_id", session.assignedSiteId)
      .order("name"),
  ]);

  const operatorOptions = availableOperators.map((op) => {
    const badge =
      op.dailyStatus && op.dailyStatus !== "in"
        ? DAILY_STATUS_BADGE[op.dailyStatus]
        : !op.dailyStatus
          ? "Not marked in"
          : null;
    return {
      id: op.id,
      label: badge ? `${op.full_name || op.username} — ${badge}` : op.full_name || op.username,
    };
  });

  const availableSlots =
    zones?.flatMap((z) =>
      (z.slots as { id: string; slot_number: string; status: string }[])
        .filter((s) => s.status === "available")
        .map((s) => ({ id: s.id, label: `${z.name} · ${s.slot_number}` }))
    ) ?? [];

  const statusOptions = ACTIVE_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }));
  const vehicleTypeOptions = (vehicleTypes ?? []).map((vt) => ({ value: vt.name, label: vt.name }));

  return {
    tickets: tickets ?? [],
    availableSlots,
    operatorOptions,
    vehicleTypeOptions,
    statusOptions,
    tariffRules: tariffRules ?? [],
    autoAllocateEnabled: site?.auto_allocate_operator ?? false,
    canToggleAutoAllocate: session.role === "parking_admin",
    canRequest: session.role === "parking_admin",
    canDispatch: session.role === "parking_admin",
    myAccountId: session.accountId,
  };
}

export async function setAutoAllocate(
  supabase: ReturnType<typeof createServiceClient>,
  session: ValetSession,
  enabled: boolean
) {
  assertParkingAdminRole(session);
  const { error } = await supabase
    .from("parking_spaces")
    .update({ auto_allocate_operator: enabled })
    .eq("id", session.assignedSiteId);
  if (error) throw new Error(error.message);
}

export async function checkInVehicle(
  supabase: ReturnType<typeof createServiceClient>,
  session: ValetSession,
  fields: { vehicleNumber: string; vehicleType: string; mobileNumber: string },
  formData: FormData
): Promise<QueueTicket> {
  const vehicle_number = fields.vehicleNumber.trim().toUpperCase();
  const vehicle_type = fields.vehicleType || "car";
  const mobile_number = fields.mobileNumber.trim();
  if (!vehicle_number || !mobile_number) {
    throw new AppError("invalid_request", "Vehicle number and mobile number are required.", 400);
  }

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

  return {
    id: ticketId,
    ticket_token: ticketToken,
    vehicle_number,
    vehicle_type,
    mobile_number,
    status: "checked_in",
    checked_in_at: new Date().toISOString(),
    checked_in_by: session.accountId,
    fare_amount: null,
    check_in_photos: photos,
    handover_photos: [],
    slots: null,
  };
}

export async function markAsParked(
  supabase: ReturnType<typeof createServiceClient>,
  session: ValetSession,
  id: string,
  slotId: string
): Promise<void> {
  const ticket = await loadTicket(supabase, id, session.assignedSiteId);
  if (!ticket) throw new AppError("not_found", "Ticket not found.", 404);
  if (ticket.status !== "checked_in") {
    throw new AppError("invalid_state", "Ticket is not awaiting parking.", 409);
  }
  // Only the operator who checked the vehicle in -- everyone else can see it, but
  // only that operator (or an admin, for stuck-ticket recovery) can mark it parked.
  if (session.role !== "parking_admin" && ticket.checked_in_by !== session.accountId) {
    throw new AppError("forbidden", "Only the operator who checked this vehicle in can mark it parked.", 403);
  }

  const { error } = await supabase
    .from("valet_tickets")
    .update({
      status: "parked",
      slot_id: slotId,
      parked_at: new Date().toISOString(),
      parked_by: session.accountId,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await supabase.from("slots").update({ status: "occupied" }).eq("id", slotId);

  await notify({
    supabase,
    siteId: session.assignedSiteId,
    ticketId: id,
    kind: "vehicle_parked",
    message: `${ticket.vehicle_number} parked`,
  });
}

export async function requestVehicle(
  supabase: ReturnType<typeof createServiceClient>,
  session: ValetSession,
  id: string
): Promise<void> {
  // Staff-side "guest requested" is Parking Admin only -- the guest's own path is
  // requestVehicleByGuest() in app/track/[token]/actions.ts, unrelated to this session.
  assertParkingAdminRole(session);
  const ticket = await loadTicket(supabase, id, session.assignedSiteId);
  if (!ticket) throw new AppError("not_found", "Ticket not found.", 404);
  if (ticket.status !== "parked") {
    throw new AppError("invalid_state", "Ticket is not parked.", 409);
  }

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
}

export async function dispatchVehicle(
  supabase: ReturnType<typeof createServiceClient>,
  session: ValetSession,
  id: string,
  operatorId: string
): Promise<void> {
  assertParkingAdminRole(session);
  const ticket = await loadTicket(supabase, id, session.assignedSiteId);
  if (!ticket) throw new AppError("not_found", "Ticket not found.", 404);
  if (ticket.status !== "requested") {
    throw new AppError("invalid_state", "Ticket is not awaiting dispatch.", 409);
  }

  const { data: operator } = await supabase
    .from("valet_accounts")
    .select("id")
    .eq("id", operatorId)
    .eq("assigned_site_id", session.assignedSiteId)
    .eq("role", "valet_operator")
    .eq("is_active", true)
    .maybeSingle();
  if (!operator) throw new AppError("invalid_request", "Selected operator is not available.", 400);

  await dispatchToOperator(supabase, session.assignedSiteId, ticket, operatorId);
}

export async function markArrived(
  supabase: ReturnType<typeof createServiceClient>,
  session: ValetSession,
  id: string
): Promise<void> {
  const ticket = await loadTicket(supabase, id, session.assignedSiteId);
  if (!ticket) throw new AppError("not_found", "Ticket not found.", 404);
  if (ticket.status !== "in_transit") {
    throw new AppError("invalid_state", "Ticket is not in transit.", 409);
  }

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
}

export async function updateTicketDetails(
  supabase: ReturnType<typeof createServiceClient>,
  session: ValetSession,
  id: string,
  fields: { vehicleNumber: string; mobileNumber: string }
): Promise<void> {
  const vehicle_number = fields.vehicleNumber.trim().toUpperCase();
  const mobile_number = fields.mobileNumber.trim();
  if (!vehicle_number || !mobile_number) {
    throw new AppError("invalid_request", "Vehicle number and mobile number are required.", 400);
  }

  const ticket = await loadTicket(supabase, id, session.assignedSiteId);
  if (!ticket) throw new AppError("not_found", "Ticket not found.", 404);
  if (ticket.status === "completed" || ticket.status === "voided") {
    throw new AppError("invalid_state", "Ticket can no longer be edited.", 409);
  }

  const { error } = await supabase
    .from("valet_tickets")
    .update({ vehicle_number, mobile_number })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function voidTicket(
  supabase: ReturnType<typeof createServiceClient>,
  session: ValetSession,
  id: string,
  reason: string | null
): Promise<void> {
  const ticket = await loadTicket(supabase, id, session.assignedSiteId);
  if (!ticket) throw new AppError("not_found", "Ticket not found.", 404);
  if (ticket.status === "completed" || ticket.status === "voided") {
    throw new AppError("invalid_state", "Ticket can no longer be voided.", 409);
  }

  const { error } = await supabase
    .from("valet_tickets")
    .update({
      status: "voided",
      voided_at: new Date().toISOString(),
      voided_by: session.accountId,
      void_reason: reason,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  if (ticket.slot_id) {
    await supabase.from("slots").update({ status: "available" }).eq("id", ticket.slot_id);
  }

  await notify({
    supabase,
    siteId: session.assignedSiteId,
    ticketId: id,
    kind: "vehicle_voided",
    message: `${ticket.vehicle_number} voided`,
  });
}

export async function completeHandover(
  supabase: ReturnType<typeof createServiceClient>,
  session: ValetSession,
  id: string,
  fields: { otp: string; fareAmount: string | null; paymentCollected: boolean },
  formData: FormData
): Promise<void> {
  const otpEntered = fields.otp.trim();
  const fareRaw = fields.fareAmount?.trim() || undefined;
  if (!otpEntered) throw new AppError("invalid_request", "OTP is required.", 400);

  const ticket = await loadTicket(supabase, id, session.assignedSiteId);
  if (!ticket) throw new AppError("not_found", "Ticket not found.", 404);
  if (ticket.status !== "arrived") {
    throw new AppError("invalid_state", "Ticket is not awaiting handover.", 409);
  }
  if (ticket.otp !== otpEntered) throw new AppError("invalid_otp", "Incorrect OTP.", 400);

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
      payment_collected: fields.paymentCollected,
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
      paymentStatus: fields.paymentCollected ? "paid" : "pending",
    },
  });
  await notify({
    supabase,
    siteId: session.assignedSiteId,
    ticketId: id,
    kind: "handover_complete",
    message: `${ticket.vehicle_number} handover complete`,
  });
}

export async function getTicketPhotoUrls(
  supabase: ReturnType<typeof createServiceClient>,
  session: ValetSession,
  ticketId: string
) {
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

export async function getTicketTimeline(
  supabase: ReturnType<typeof createServiceClient>,
  session: ValetSession,
  ticketId: string
): Promise<Transaction[]> {
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
