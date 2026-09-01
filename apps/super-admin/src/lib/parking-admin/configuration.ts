import "server-only";
import { revalidateTag } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveEffectiveFrom } from "@/lib/tariff";
import { AppError } from "./errors";

// Shared insert/delete/scoping logic with the web Configuration page's
// Server Actions (app/parking-admin/(authenticated)/configuration/actions.ts)
// -- these functions back the new v1/configuration/* routes specifically, so
// cache invalidation here uses revalidateTag(tag, profile), the Route
// Handler form (this repo's own AGENTS.md: Server Actions use updateTag(tag)
// instead, since it expires the tag for read-your-own-writes immediately;
// that doesn't apply to a Route Handler response, which has no "own writes"
// to read back before returning).

// -- Zones & Slots ----------------------------------------------------------

export function mapSlotForApi(slot: {
  id: string;
  slot_number: string;
  is_ev: boolean;
  is_disabled_slot: boolean;
  status: string;
}) {
  return {
    id: slot.id,
    slotNumber: slot.slot_number,
    isEv: slot.is_ev,
    isDisabledSlot: slot.is_disabled_slot,
    status: slot.status,
  };
}

export function mapZoneForApi(zone: {
  id: string;
  name: string;
  slots: Parameters<typeof mapSlotForApi>[0][];
}) {
  return { id: zone.id, name: zone.name, slots: zone.slots.map(mapSlotForApi) };
}

export async function listZones(supabase: ReturnType<typeof createServiceClient>, siteId: string) {
  const { data } = await supabase
    .from("zones")
    .select("id, name, slots(id, slot_number, is_ev, is_disabled_slot, status)")
    .eq("parking_space_id", siteId)
    .order("name");
  return data ?? [];
}

export async function createZone(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string,
  name: string
) {
  const { data, error } = await supabase
    .from("zones")
    .insert({ parking_space_id: siteId, name })
    .select("id, name")
    .single();
  if (error) throw new AppError("insert_failed", error.message, 400);
  return data;
}

export async function deleteZone(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string,
  id: string
) {
  const { error } = await supabase
    .from("zones")
    .delete()
    .eq("id", id)
    .eq("parking_space_id", siteId);
  if (error) throw new AppError("delete_failed", error.message, 400);
}

export async function createSlot(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string,
  zoneId: string,
  fields: { slot_number: string; is_ev: boolean; is_disabled_slot: boolean }
) {
  const { data: zone } = await supabase
    .from("zones")
    .select("id")
    .eq("id", zoneId)
    .eq("parking_space_id", siteId)
    .maybeSingle();
  if (!zone) throw new AppError("not_found", "Zone not found.", 404);

  const { data, error } = await supabase
    .from("slots")
    .insert({ zone_id: zoneId, ...fields })
    .select("id, slot_number, is_ev, is_disabled_slot, status")
    .single();
  if (error) throw new AppError("insert_failed", error.message, 400);
  return data;
}

const MAX_BULK_SLOTS = 500;

export async function createSlotsBulk(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string,
  zoneId: string,
  fields: { prefix: string; start: number; end: number; is_ev: boolean; is_disabled_slot: boolean }
) {
  const { data: zone } = await supabase
    .from("zones")
    .select("id")
    .eq("id", zoneId)
    .eq("parking_space_id", siteId)
    .maybeSingle();
  if (!zone) throw new AppError("not_found", "Zone not found.", 404);

  if (fields.end < fields.start) {
    throw new AppError("invalid_request", "End must be greater than or equal to start.", 400);
  }
  const count = fields.end - fields.start + 1;
  if (count > MAX_BULK_SLOTS) {
    throw new AppError("invalid_request", `Cannot create more than ${MAX_BULK_SLOTS} slots at once.`, 400);
  }

  const rows = Array.from({ length: count }, (_, i) => {
    const n = fields.start + i;
    return {
      zone_id: zoneId,
      slot_number: fields.prefix ? `${fields.prefix} ${n}` : String(n),
      is_ev: fields.is_ev,
      is_disabled_slot: fields.is_disabled_slot,
    };
  });

  const { data, error } = await supabase
    .from("slots")
    .insert(rows)
    .select("id, slot_number, is_ev, is_disabled_slot, status");
  if (error) {
    if (error.code === "23505") {
      throw new AppError("invalid_request", "Some of these slot numbers already exist in this zone.", 409);
    }
    throw new AppError("insert_failed", error.message, 400);
  }
  return data;
}

export async function deleteSlot(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string,
  id: string
) {
  const { data: slot } = await supabase
    .from("slots")
    .select("id, zones!inner(parking_space_id)")
    .eq("id", id)
    .eq("zones.parking_space_id", siteId)
    .maybeSingle();
  if (!slot) throw new AppError("not_found", "Slot not found.", 404);

  const { error } = await supabase.from("slots").delete().eq("id", id);
  if (error) throw new AppError("delete_failed", error.message, 400);
}

// -- Vehicle types ------------------------------------------------------

export async function listVehicleTypes(supabase: ReturnType<typeof createServiceClient>, siteId: string) {
  const { data } = await supabase
    .from("vehicle_types")
    .select("id, name")
    .eq("parking_space_id", siteId)
    .order("name");
  return data ?? [];
}

export async function createVehicleType(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string,
  name: string
) {
  const { data, error } = await supabase
    .from("vehicle_types")
    .insert({ parking_space_id: siteId, name })
    .select("id, name")
    .single();
  if (error) throw new AppError("insert_failed", error.message, 400);
  revalidateTag(`vehicle-types:${siteId}`, "max");
  return data;
}

export async function deleteVehicleType(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string,
  id: string
) {
  const { error } = await supabase
    .from("vehicle_types")
    .delete()
    .eq("id", id)
    .eq("parking_space_id", siteId);
  if (error) throw new AppError("delete_failed", error.message, 400);
  revalidateTag(`vehicle-types:${siteId}`, "max");
}

// -- Tariff rules -------------------------------------------------------

export type TariffRuleInput = {
  vehicle_category: string;
  pricing_type: "flat" | "hourly" | "surge" | "slab";
  rate?: number;
  surge_multiplier?: number | null;
  slab_tiers?: { upto_minutes: number | null; rate: number }[] | null;
  effective_date?: string | null;
};

// v1 REST responses use camelCase throughout (see vehicles/route.ts's mapTicket,
// dashboard/route.ts) -- these DB-shaped functions stay snake_case internally
// (matching the web page's own field access), this mapper is the API boundary.
export function mapTariffRuleForApi(rule: {
  id: string;
  vehicle_category: string;
  pricing_type: string;
  rate: number;
  surge_multiplier: number | null;
  slab_tiers: { upto_minutes: number | null; rate: number }[] | null;
  effective_from: string;
}) {
  return {
    id: rule.id,
    vehicleCategory: rule.vehicle_category,
    pricingType: rule.pricing_type,
    rate: rule.rate,
    surgeMultiplier: rule.surge_multiplier,
    slabTiers: rule.slab_tiers,
    effectiveFrom: rule.effective_from,
  };
}

export async function listTariffRules(supabase: ReturnType<typeof createServiceClient>, siteId: string) {
  const { data } = await supabase
    .from("tariff_rules")
    .select("id, vehicle_category, pricing_type, rate, surge_multiplier, slab_tiers, effective_from")
    .eq("parking_space_id", siteId)
    .order("vehicle_category")
    .order("effective_from");
  return data ?? [];
}

function parseSlabOrRate(input: {
  pricing_type: "flat" | "hourly" | "surge" | "slab";
  rate?: number;
  slab_tiers?: { upto_minutes: number | null; rate: number }[] | null;
}) {
  if (input.pricing_type === "slab") {
    const slab_tiers = (input.slab_tiers ?? []).filter((t) => Number.isFinite(t.rate));
    if (!slab_tiers.length) throw new AppError("invalid_request", "At least one slab tier is required.", 400);
    return { rate: slab_tiers[0].rate, slab_tiers };
  }
  if (input.rate === undefined || !Number.isFinite(input.rate)) {
    throw new AppError("invalid_request", "Rate is required.", 400);
  }
  return { rate: input.rate, slab_tiers: null };
}

export async function createTariffRule(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string,
  input: TariffRuleInput
) {
  const { rate, slab_tiers } = parseSlabOrRate(input);

  const { data, error } = await supabase
    .from("tariff_rules")
    .insert({
      parking_space_id: siteId,
      vehicle_category: input.vehicle_category,
      pricing_type: input.pricing_type,
      rate,
      surge_multiplier: input.surge_multiplier ?? null,
      slab_tiers,
      effective_from: resolveEffectiveFrom(input.effective_date),
    })
    .select("id, vehicle_category, pricing_type, rate, surge_multiplier, slab_tiers, effective_from")
    .single();
  if (error) throw new AppError("insert_failed", error.message, 400);
  revalidateTag(`tariff-rules:${siteId}`, "max");
  return data;
}

// "Editing" inserts a new versioned row for the same vehicle_category rather than
// mutating the old one -- see tariff.ts's resolveEffectiveFrom and queue.ts's
// getCachedTariffRules for why (a future-dated edit must not disturb the still-active
// current value).
export async function updateTariffRule(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string,
  id: string,
  input: Omit<TariffRuleInput, "vehicle_category">
) {
  const { data: existing } = await supabase
    .from("tariff_rules")
    .select("vehicle_category")
    .eq("id", id)
    .eq("parking_space_id", siteId)
    .maybeSingle();
  if (!existing) throw new AppError("not_found", "Tariff rule not found.", 404);

  const { rate, slab_tiers } = parseSlabOrRate(input);

  const { data, error } = await supabase
    .from("tariff_rules")
    .insert({
      parking_space_id: siteId,
      vehicle_category: existing.vehicle_category,
      pricing_type: input.pricing_type,
      rate,
      surge_multiplier: input.surge_multiplier ?? null,
      slab_tiers,
      effective_from: resolveEffectiveFrom(input.effective_date),
    })
    .select("id, vehicle_category, pricing_type, rate, surge_multiplier, slab_tiers, effective_from")
    .single();
  if (error) throw new AppError("insert_failed", error.message, 400);
  revalidateTag(`tariff-rules:${siteId}`, "max");
  return data;
}

export async function deleteTariffRule(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string,
  id: string
) {
  const { error } = await supabase
    .from("tariff_rules")
    .delete()
    .eq("id", id)
    .eq("parking_space_id", siteId);
  if (error) throw new AppError("delete_failed", error.message, 400);
  revalidateTag(`tariff-rules:${siteId}`, "max");
}

// -- Vehicle passes -------------------------------------------------------

export function mapVehiclePassForApi(pass: { id: string; vehicle_number: string; label: string | null }) {
  return { id: pass.id, vehicleNumber: pass.vehicle_number, label: pass.label };
}

export async function listVehiclePasses(supabase: ReturnType<typeof createServiceClient>, siteId: string) {
  const { data } = await supabase
    .from("vehicle_passes")
    .select("id, vehicle_number, label")
    .eq("parking_space_id", siteId)
    .order("vehicle_number");
  return data ?? [];
}

export async function createVehiclePass(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string,
  vehicleNumber: string,
  label: string | null
) {
  const { data, error } = await supabase
    .from("vehicle_passes")
    .insert({ parking_space_id: siteId, vehicle_number: vehicleNumber.trim().toUpperCase(), label })
    .select("id, vehicle_number, label")
    .single();
  if (error) throw new AppError("insert_failed", error.message, 400);
  revalidateTag(`vehicle-passes:${siteId}`, "max");
  return data;
}

export async function deleteVehiclePass(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string,
  id: string
) {
  const { error } = await supabase
    .from("vehicle_passes")
    .delete()
    .eq("id", id)
    .eq("parking_space_id", siteId);
  if (error) throw new AppError("delete_failed", error.message, 400);
  revalidateTag(`vehicle-passes:${siteId}`, "max");
}
