import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { randomBytes, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentSiteId, type ValetSession } from "@/lib/valet-auth/session";
import { generateOtp } from "@/lib/otp";
import { BUCKET, uploadTicketPhotos } from "@/lib/valet-photos";
import { fireTrigger } from "@/lib/communication-triggers";
import { getAvailableOperators } from "@/lib/operator-availability";
import { TICKET_TIMELINE_SELECT, unpivot, type TicketRow, type Transaction } from "@/lib/ticket-timeline";
import { notify } from "@/lib/valet-notifications";
import { dispatchPush } from "@/lib/push/dispatch";
import { computeFare, type TariffRule } from "@/lib/tariff";
import { isVehicleWhitelisted } from "./vehicle-passes";
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

// vehicle_types and tariff_rules change only via the Settings page (edited far
// less often than every Live Queue load reads them), so both are cached
// per-site with a short revalidate as a self-healing safety net, on top of
// revalidateTag() calls from every write path (configuration/actions.ts, plus
// the Super Admin portal's app/dashboard/parking-spaces/actions.ts for
// tariff_rules). zones/slots are deliberately NOT cached here -- they embed
// live slots.status, written directly by ticket mutations.
export function getCachedVehicleTypes(siteId: string) {
  return unstable_cache(
    async () => {
      const { data } = await createServiceClient()
        .from("vehicle_types")
        .select("id, name")
        .eq("parking_space_id", siteId)
        .order("name");
      return data ?? [];
    },
    ["vehicle-types", siteId],
    { tags: [`vehicle-types:${siteId}`], revalidate: 60 }
  )();
}

export function getCachedTariffRules(siteId: string) {
  return unstable_cache(
    async () => {
      const { data } = await createServiceClient()
        .from("tariff_rules")
        .select("vehicle_category, pricing_type, rate, surge_multiplier, slab_tiers")
        .eq("parking_space_id", siteId)
        .returns<TariffRule[]>();
      return data ?? [];
    },
    ["tariff-rules", siteId],
    { tags: [`tariff-rules:${siteId}`], revalidate: 60 }
  )();
}

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
  qr_code_id: string | null;
  qr_codes: { code: string } | null;
  // Direct Checkout mode only -- a fare preview computed in getQueueData for
  // checked_in/parked tickets, so the UI can show "fare due" before the operator
  // opens the checkout dialog. Always null/false when the site isn't in that mode.
  suggested_fare: number | null;
  is_pass_vehicle: boolean;
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

// One request-cached read backing both getSiteName and isAutoAllocateEnabled.
// These used to be two separate queries for the same row, and getSiteName is hit
// from four different mutation paths (twice over when auto-allocation chains into
// dispatchToOperator) -- with the Supabase project a long round-trip away, each
// of those repeats was real latency on a button press. Safe to memoize: the
// service client is a stable singleton, so the cache key is stable, and React's
// cache is request-scoped.
const getSiteRow = cache(async function getSiteRow(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string
) {
  const { data } = await supabase
    .from("parking_spaces")
    .select("name, auto_allocate_operator, guest_request_mode, direct_checkout_mode")
    .eq("id", siteId)
    .single();
  return data;
});

export async function getSiteName(supabase: ReturnType<typeof createServiceClient>, siteId: string) {
  const site = await getSiteRow(supabase, siteId);
  return site?.name ?? "Valet parking";
}

export async function isAutoAllocateEnabled(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string
) {
  const site = await getSiteRow(supabase, siteId);
  return site?.auto_allocate_operator ?? false;
}

export async function isQrModeEnabled(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string
) {
  const site = await getSiteRow(supabase, siteId);
  return site?.guest_request_mode === "qr";
}

// When on, checkout skips the guest request/dispatch/OTP pipeline entirely -- see
// completeDirectCheckout below. Off by default; every existing site is unaffected.
export async function isDirectCheckoutEnabled(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string
) {
  const site = await getSiteRow(supabase, siteId);
  return site?.direct_checkout_mode ?? false;
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

  // These three side effects are independent of each other and all three are
  // best-effort by contract (each swallows its own errors and never throws), so
  // they run concurrently instead of in a chain -- the guest-facing message, the
  // in-app bell notification, and the operator's push used to add up to four
  // serial round-trips before the operator's tap was acknowledged.
  await Promise.all([
    (async () => {
      const [siteName, baseUrl] = await Promise.all([getSiteName(supabase, siteId), getBaseUrl()]);
      await fireTrigger({
        supabase,
        siteId,
        triggerKey: "vehicle_in_transit",
        ticketId: ticket.id,
        mobileNumber: ticket.mobile_number,
        variables: {
          vehicleNumber: ticket.vehicle_number,
          siteName,
          trackingUrl: `${baseUrl}/track/${ticket.ticket_token}`,
        },
      });
    })(),
    notify({
      supabase,
      siteId,
      ticketId: ticket.id,
      kind: "vehicle_dispatched",
      message: `${ticket.vehicle_number} dispatched to an operator`,
    }),
    dispatchPush(
      supabase,
      operatorId,
      "Vehicle assigned",
      `${ticket.vehicle_number} is ready for pickup`,
      { ticketId: ticket.id }
    ),
  ]);
}

type LoadedTicket = {
  id: string;
  status: string;
  otp: string | null;
  slot_id: string | null;
  parking_space_id: string;
  vehicle_number: string;
  vehicle_type: string;
  mobile_number: string;
  ticket_token: string;
  checked_in_by: string | null;
  qr_code_id: string | null;
  qr_codes: { code: string } | null;
};

export async function loadTicket(
  supabase: ReturnType<typeof createServiceClient>,
  id: string,
  siteId: string
) {
  const { data } = await supabase
    .from("valet_tickets")
    .select(
      "id, status, otp, slot_id, parking_space_id, vehicle_number, vehicle_type, mobile_number, ticket_token, checked_in_by, qr_code_id, qr_codes(code)"
    )
    .eq("id", id)
    .eq("parking_space_id", siteId)
    .returns<LoadedTicket[]>()
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
  guestRequestMode: "link" | "qr";
  directCheckoutModeEnabled: boolean;
  // "Guest requested" and manual dispatch are Parking Admin only; mark-as-parked is
  // the checked-in operator or an admin (evaluated per-ticket, see QueueTicket).
  canRequest: boolean;
  canDispatch: boolean;
  myAccountId: string;
  // Explains why the dispatch operator list is empty (no operators assigned to
  // the site vs. all of them currently out with another vehicle) -- null when
  // at least one operator is dispatchable.
  dispatchUnavailableReason: string | null;
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
      "id, ticket_token, vehicle_number, vehicle_type, mobile_number, status, checked_in_at, checked_in_by, fare_amount, check_in_photos, handover_photos, slots(slot_number), qr_code_id, qr_codes(code)"
    )
    .eq("parking_space_id", getCurrentSiteId(session))
    .in("status", ACTIVE_STATUSES as unknown as string[]);
  if (statusFilter.length) ticketsQuery = ticketsQuery.in("status", statusFilter);
  if (vehicleTypeFilter.length) ticketsQuery = ticketsQuery.in("vehicle_type", vehicleTypeFilter);

  const [
    { data: tickets },
    { data: zones },
    tariffRules,
    { data: site },
    availableOperators,
    vehicleTypes,
    { count: totalActiveOperators },
  ] = await Promise.all([
    ticketsQuery.order("checked_in_at", { ascending: true }).returns<QueueTicket[]>(),
    supabase
      .from("zones")
      .select("id, name, slots(id, slot_number, status)")
      .eq("parking_space_id", getCurrentSiteId(session)),
    getCachedTariffRules(getCurrentSiteId(session)),
    supabase
      .from("parking_spaces")
      .select("auto_allocate_operator, guest_request_mode, direct_checkout_mode")
      .eq("id", getCurrentSiteId(session))
      .single(),
    getAvailableOperators(supabase, getCurrentSiteId(session), { respectDailyStatus: false }),
    getCachedVehicleTypes(getCurrentSiteId(session)),
    supabase
      .from("valet_accounts")
      .select("id", { count: "exact", head: true })
      .eq("assigned_site_id", getCurrentSiteId(session))
      .eq("role", "valet_operator")
      .eq("is_active", true),
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

  // Explains an empty operatorOptions list: none assigned to the site at all,
  // vs. all of them currently dispatched_by an in_transit/arrived ticket (out
  // with another vehicle). Daily status (In/Break/Out) is never the cause here
  // since manual dispatch calls getAvailableOperators with respectDailyStatus: false.
  const dispatchUnavailableReason =
    operatorOptions.length > 0
      ? null
      : !totalActiveOperators
        ? "No valet operators are assigned to this site yet. Add one under Valet Operators."
        : totalActiveOperators === 1
          ? "The only operator assigned to this site is currently out with another vehicle."
          : `All ${totalActiveOperators} operators assigned to this site are currently out with another vehicle.`;

  const availableSlots =
    zones?.flatMap((z) =>
      (z.slots as { id: string; slot_number: string; status: string }[])
        .filter((s) => s.status === "available")
        .map((s) => ({ id: s.id, label: `${z.name} · ${s.slot_number}` }))
    ) ?? [];

  const statusOptions = ACTIVE_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }));
  const vehicleTypeOptions = (vehicleTypes ?? []).map((vt) => ({ value: vt.name, label: vt.name }));

  const directCheckoutModeEnabled = site?.direct_checkout_mode ?? false;

  // Fare/pass preview is Direct Checkout-only and only meaningful for tickets that
  // haven't been checked out yet -- costs nothing for every other site (no extra
  // query) and doesn't touch requested/in_transit/arrived tickets, which still go
  // through the classic handover flow's own fare entry regardless of this flag.
  let passSet = new Set<string>();
  if (directCheckoutModeEnabled) {
    const { data: passes } = await supabase
      .from("vehicle_passes")
      .select("vehicle_number")
      .eq("parking_space_id", getCurrentSiteId(session));
    passSet = new Set((passes ?? []).map((p) => p.vehicle_number.toUpperCase()));
  }

  const ticketsWithPreview = (tickets ?? []).map((t) => {
    if (!directCheckoutModeEnabled || (t.status !== "checked_in" && t.status !== "parked")) {
      return { ...t, suggested_fare: null, is_pass_vehicle: false };
    }
    const isPassVehicle = passSet.has(t.vehicle_number.toUpperCase());
    const minutesParked = Math.max(0, (Date.now() - new Date(t.checked_in_at).getTime()) / 60000);
    const suggestedFare = isPassVehicle ? 0 : computeFare(tariffRules ?? [], t.vehicle_type, minutesParked);
    return { ...t, suggested_fare: suggestedFare, is_pass_vehicle: isPassVehicle };
  });

  return {
    tickets: ticketsWithPreview,
    availableSlots,
    operatorOptions,
    vehicleTypeOptions,
    statusOptions,
    tariffRules: tariffRules ?? [],
    autoAllocateEnabled: site?.auto_allocate_operator ?? false,
    canToggleAutoAllocate: session.role === "parking_admin",
    guestRequestMode: (site?.guest_request_mode as "link" | "qr" | undefined) ?? "link",
    directCheckoutModeEnabled,
    canRequest: session.role === "parking_admin",
    canDispatch: session.role === "parking_admin",
    myAccountId: session.accountId,
    dispatchUnavailableReason,
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
    .eq("id", getCurrentSiteId(session));
  if (error) throw new Error(error.message);
}

export async function setDirectCheckoutMode(
  supabase: ReturnType<typeof createServiceClient>,
  session: ValetSession,
  enabled: boolean
) {
  assertParkingAdminRole(session);
  const { error } = await supabase
    .from("parking_spaces")
    .update({ direct_checkout_mode: enabled })
    .eq("id", getCurrentSiteId(session));
  if (error) throw new Error(error.message);
}

// Only ever called from checkInVehicle below -- lives here (not qr-codes.ts) purely
// to avoid a circular import, since qr-codes.ts already imports ACTIVE_STATUSES and
// assertParkingAdminRole from this file.
async function resolveQrCodeForCheckIn(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string,
  code: string
): Promise<string> {
  const { data: qrCode } = await supabase
    .from("qr_codes")
    .select("id")
    .eq("site_id", siteId)
    .eq("code", code)
    .maybeSingle();
  if (!qrCode) throw new AppError("invalid_request", "Unknown QR code for this site.", 400);

  const { data: activeTicket } = await supabase
    .from("valet_tickets")
    .select("id")
    .eq("qr_code_id", qrCode.id)
    .in("status", ACTIVE_STATUSES as unknown as string[])
    .maybeSingle();
  if (activeTicket) {
    throw new AppError("invalid_state", "This QR code is already assigned to an active vehicle.", 409);
  }

  return qrCode.id;
}

export async function checkInVehicle(
  supabase: ReturnType<typeof createServiceClient>,
  session: ValetSession,
  fields: { vehicleNumber: string; vehicleType: string; mobileNumber: string; qrCode?: string },
  formData: FormData
): Promise<QueueTicket> {
  const vehicle_number = fields.vehicleNumber.trim().toUpperCase();
  const vehicle_type = fields.vehicleType || "car";
  const mobile_number = fields.mobileNumber.trim();
  const directCheckoutMode = await isDirectCheckoutEnabled(supabase, getCurrentSiteId(session));
  if (!vehicle_number || (!directCheckoutMode && !mobile_number)) {
    throw new AppError("invalid_request", "Vehicle number and mobile number are required.", 400);
  }

  // Direct Checkout mode has no guest self-service tracking to key a QR code to --
  // mobile number and QR are both purely optional metadata in that mode.
  let qrCodeId: string | null = null;
  if (!directCheckoutMode && (await isQrModeEnabled(supabase, getCurrentSiteId(session)))) {
    const qrCode = fields.qrCode?.trim().toUpperCase();
    if (!qrCode) {
      throw new AppError("invalid_request", "QR code is required for this site.", 400);
    }
    qrCodeId = await resolveQrCodeForCheckIn(supabase, getCurrentSiteId(session), qrCode);
  }

  const ticketId = randomUUID();
  const photos = await uploadTicketPhotos(
    supabase,
    getCurrentSiteId(session),
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
    parking_space_id: getCurrentSiteId(session),
    ticket_token: ticketToken,
    vehicle_number,
    vehicle_type,
    mobile_number,
    status: "checked_in",
    checked_in_by: session.accountId,
    check_in_photos: photos,
    qr_code_id: qrCodeId,
  });
  if (error) throw new Error(error.message);

  await Promise.all([
    // No mobile number in Direct Checkout mode means no guest to notify -- skip the
    // trigger entirely rather than firing a messaging call with a blank number.
    mobile_number
      ? (async () => {
          const [siteName, baseUrl] = await Promise.all([
            getSiteName(supabase, getCurrentSiteId(session)),
            getBaseUrl(),
          ]);
          await fireTrigger({
            supabase,
            siteId: getCurrentSiteId(session),
            triggerKey: "vehicle_checked_in",
            ticketId,
            mobileNumber: mobile_number,
            variables: {
              vehicleNumber: vehicle_number,
              vehicleType: vehicle_type,
              mobileNumber: mobile_number,
              siteName,
              trackingUrl: `${baseUrl}/track/${ticketToken}`,
            },
          });
        })()
      : Promise.resolve(),
    notify({
      supabase,
      siteId: getCurrentSiteId(session),
      ticketId,
      kind: "vehicle_checked_in",
      message: `${vehicle_number} checked in`,
    }),
  ]);

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
    qr_code_id: qrCodeId,
    qr_codes: null,
    suggested_fare: null,
    is_pass_vehicle: false,
  };
}

export async function markAsParked(
  supabase: ReturnType<typeof createServiceClient>,
  session: ValetSession,
  id: string,
  slotId: string
): Promise<void> {
  const ticket = await loadTicket(supabase, id, getCurrentSiteId(session));
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
    siteId: getCurrentSiteId(session),
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
  const ticket = await loadTicket(supabase, id, getCurrentSiteId(session));
  if (!ticket) throw new AppError("not_found", "Ticket not found.", 404);
  if (ticket.status !== "parked") {
    throw new AppError("invalid_state", "Ticket is not parked.", 409);
  }

  const { error } = await supabase
    .from("valet_tickets")
    .update({
      status: "requested",
      requested_at: new Date().toISOString(),
      otp: ticket.qr_code_id ? null : generateOtp(),
      requested_by: session.accountId,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  // Deliberately still awaited *before* the auto-allocate branch below, even
  // though both are independent: dispatchToOperator fires its own guest-facing
  // "in transit" message, and the guest should not receive that ahead of this
  // "pickup requested" one.
  await Promise.all([
    (async () => {
      const [siteName, baseUrl] = await Promise.all([
        getSiteName(supabase, getCurrentSiteId(session)),
        getBaseUrl(),
      ]);
      await fireTrigger({
        supabase,
        siteId: getCurrentSiteId(session),
        triggerKey: "pickup_requested",
        ticketId: id,
        mobileNumber: ticket.mobile_number,
        variables: {
          vehicleNumber: ticket.vehicle_number,
          siteName,
          trackingUrl: `${baseUrl}/track/${ticket.ticket_token}`,
        },
      });
    })(),
    notify({
      supabase,
      siteId: getCurrentSiteId(session),
      ticketId: id,
      kind: "vehicle_requested",
      message: `${ticket.vehicle_number} pickup requested`,
    }),
  ]);

  if (await isAutoAllocateEnabled(supabase, getCurrentSiteId(session))) {
    const available = await getAvailableOperators(supabase, getCurrentSiteId(session));
    if (available.length > 0) {
      await dispatchToOperator(supabase, getCurrentSiteId(session), ticket, available[0].id);
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
  const ticket = await loadTicket(supabase, id, getCurrentSiteId(session));
  if (!ticket) throw new AppError("not_found", "Ticket not found.", 404);
  if (ticket.status !== "requested") {
    throw new AppError("invalid_state", "Ticket is not awaiting dispatch.", 409);
  }

  const { data: operator } = await supabase
    .from("valet_accounts")
    .select("id")
    .eq("id", operatorId)
    .eq("assigned_site_id", getCurrentSiteId(session))
    .eq("role", "valet_operator")
    .eq("is_active", true)
    .maybeSingle();
  if (!operator) throw new AppError("invalid_request", "Selected operator is not available.", 400);

  await dispatchToOperator(supabase, getCurrentSiteId(session), ticket, operatorId);
}

export async function markArrived(
  supabase: ReturnType<typeof createServiceClient>,
  session: ValetSession,
  id: string
): Promise<void> {
  const ticket = await loadTicket(supabase, id, getCurrentSiteId(session));
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

  await Promise.all([
    (async () => {
      const [siteName, baseUrl] = await Promise.all([
        getSiteName(supabase, getCurrentSiteId(session)),
        getBaseUrl(),
      ]);
      await fireTrigger({
        supabase,
        siteId: getCurrentSiteId(session),
        triggerKey: "vehicle_arrived",
        ticketId: id,
        mobileNumber: ticket.mobile_number,
        variables: {
          vehicleNumber: ticket.vehicle_number,
          siteName,
          otp: ticket.otp ?? "",
          trackingUrl: `${baseUrl}/track/${ticket.ticket_token}`,
        },
      });
    })(),
    notify({
      supabase,
      siteId: getCurrentSiteId(session),
      ticketId: id,
      kind: "vehicle_arrived",
      message: `${ticket.vehicle_number} has arrived`,
    }),
  ]);
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

  const ticket = await loadTicket(supabase, id, getCurrentSiteId(session));
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
  const ticket = await loadTicket(supabase, id, getCurrentSiteId(session));
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
    siteId: getCurrentSiteId(session),
    ticketId: id,
    kind: "vehicle_voided",
    message: `${ticket.vehicle_number} voided`,
  });
}

// Shared by completeHandover (gated by OTP/QR match) and completeDirectCheckout
// (gated by direct_checkout_mode instead) -- the actual "finish this ticket" write:
// photo upload, completion fields, slot-freeing, guest trigger + in-app notify.
async function finalizeTicketCompletion(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string,
  ticket: LoadedTicket,
  fields: { fareAmount: string | null; paymentCollected: boolean },
  formData: FormData,
  deliveredBy: string
): Promise<void> {
  const fareRaw = fields.fareAmount?.trim() || undefined;

  const handoverPhotos = await uploadTicketPhotos(
    supabase,
    siteId,
    ticket.id,
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
      delivered_by: deliveredBy,
    })
    .eq("id", ticket.id);
  if (error) throw new Error(error.message);

  if (ticket.slot_id) {
    await supabase.from("slots").update({ status: "available" }).eq("id", ticket.slot_id);
  }

  await Promise.all([
    (async () => {
      const siteName = await getSiteName(supabase, siteId);
      await fireTrigger({
        supabase,
        siteId,
        triggerKey: "handover_complete",
        ticketId: ticket.id,
        mobileNumber: ticket.mobile_number,
        variables: {
          vehicleNumber: ticket.vehicle_number,
          siteName,
          fareAmount: fareRaw ?? "0",
          paymentStatus: fields.paymentCollected ? "paid" : "pending",
        },
      });
    })(),
    notify({
      supabase,
      siteId,
      ticketId: ticket.id,
      kind: "handover_complete",
      message: `${ticket.vehicle_number} handover complete`,
    }),
  ]);
}

export async function completeHandover(
  supabase: ReturnType<typeof createServiceClient>,
  session: ValetSession,
  id: string,
  fields: { otp?: string; qrCode?: string; fareAmount: string | null; paymentCollected: boolean },
  formData: FormData
): Promise<void> {
  const ticket = await loadTicket(supabase, id, getCurrentSiteId(session));
  if (!ticket) throw new AppError("not_found", "Ticket not found.", 404);
  if (ticket.status !== "arrived") {
    throw new AppError("invalid_state", "Ticket is not awaiting handover.", 409);
  }
  if (ticket.qr_code_id) {
    const qrEntered = fields.qrCode?.trim().toUpperCase();
    if (!qrEntered) throw new AppError("invalid_request", "QR code is required.", 400);
    if (ticket.qr_codes?.code !== qrEntered) {
      throw new AppError("invalid_qr_code", "QR code does not match this ticket.", 400);
    }
  } else {
    const otpEntered = fields.otp?.trim();
    if (!otpEntered) throw new AppError("invalid_request", "OTP is required.", 400);
    if (ticket.otp !== otpEntered) throw new AppError("invalid_otp", "Incorrect OTP.", 400);
  }

  await finalizeTicketCompletion(supabase, getCurrentSiteId(session), ticket, fields, formData, session.accountId);
}

// Direct Checkout mode's checkout action -- no OTP/QR gate, reachable from
// checked_in or parked (a Direct Checkout ticket never goes through request/
// dispatch/arrived at all). Open to any authenticated valet role, matching
// completeHandover's own openness (this is a staff action, not admin-only).
export async function completeDirectCheckout(
  supabase: ReturnType<typeof createServiceClient>,
  session: ValetSession,
  id: string,
  fields: { fareAmount: string | null; paymentCollected: boolean },
  formData: FormData
): Promise<void> {
  const siteId = getCurrentSiteId(session);
  if (!(await isDirectCheckoutEnabled(supabase, siteId))) {
    throw new AppError("forbidden", "Direct checkout mode is not enabled for this site.", 403);
  }

  const ticket = await loadTicket(supabase, id, siteId);
  if (!ticket) throw new AppError("not_found", "Ticket not found.", 404);
  if (ticket.status !== "checked_in" && ticket.status !== "parked") {
    throw new AppError("invalid_state", "Ticket is not awaiting checkout.", 409);
  }

  // Whitelisted vehicles always check out at zero fare with no payment step --
  // enforced server-side regardless of what the client submits.
  const isPass = await isVehicleWhitelisted(siteId, ticket.vehicle_number);
  const effectiveFields = isPass ? { fareAmount: "0", paymentCollected: true } : fields;

  await finalizeTicketCompletion(supabase, siteId, ticket, effectiveFields, formData, session.accountId);
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
    .eq("parking_space_id", getCurrentSiteId(session))
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
    .eq("parking_space_id", getCurrentSiteId(session))
    .single<TicketRow>();
  if (!ticket) return [];

  return unpivot(ticket).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}
