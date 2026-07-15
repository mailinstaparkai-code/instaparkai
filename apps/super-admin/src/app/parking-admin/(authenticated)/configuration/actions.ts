"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { getValetSession } from "@/lib/valet-auth/session";

const PATH = "/parking-admin/configuration";

async function assertParkingAdmin() {
  const session = await getValetSession();
  if (!session || session.role !== "parking_admin") {
    throw new Error("Parking Admin access required.");
  }
  return session;
}

// -- Zones --------------------------------------------------------------

export async function createZone(formData: FormData) {
  const name = formData.get("name")?.toString().trim();
  if (!name) return;

  const session = await assertParkingAdmin();
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("zones")
    .insert({ parking_space_id: session.assignedSiteId, name });
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
}

export async function deleteZone(formData: FormData) {
  const id = formData.get("id")?.toString();
  if (!id) return;

  const session = await assertParkingAdmin();
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("zones")
    .delete()
    .eq("id", id)
    .eq("parking_space_id", session.assignedSiteId);
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
}

// -- Slots ----------------------------------------------------------------

export async function createSlot(formData: FormData) {
  const zone_id = formData.get("zone_id")?.toString();
  const slot_number = formData.get("slot_number")?.toString().trim();
  const is_ev = formData.get("is_ev") === "on";
  const is_disabled_slot = formData.get("is_disabled_slot") === "on";
  if (!zone_id || !slot_number) return;

  const session = await assertParkingAdmin();
  const supabase = createServiceClient();

  const { data: zone } = await supabase
    .from("zones")
    .select("id")
    .eq("id", zone_id)
    .eq("parking_space_id", session.assignedSiteId)
    .maybeSingle();
  if (!zone) throw new Error("Zone not found.");

  const { error } = await supabase
    .from("slots")
    .insert({ zone_id, slot_number, is_ev, is_disabled_slot });
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
}

export async function deleteSlot(formData: FormData) {
  const id = formData.get("id")?.toString();
  if (!id) return;

  const session = await assertParkingAdmin();
  const supabase = createServiceClient();

  const { data: slot } = await supabase
    .from("slots")
    .select("id, zones!inner(parking_space_id)")
    .eq("id", id)
    .eq("zones.parking_space_id", session.assignedSiteId)
    .maybeSingle();
  if (!slot) throw new Error("Slot not found.");

  const { error } = await supabase.from("slots").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
}

// -- Vehicle types ----------------------------------------------------------

export async function createVehicleType(formData: FormData) {
  const name = formData.get("name")?.toString().trim();
  if (!name) return;

  const session = await assertParkingAdmin();
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("vehicle_types")
    .insert({ parking_space_id: session.assignedSiteId, name });
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
}

export async function deleteVehicleType(formData: FormData) {
  const id = formData.get("id")?.toString();
  if (!id) return;

  const session = await assertParkingAdmin();
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("vehicle_types")
    .delete()
    .eq("id", id)
    .eq("parking_space_id", session.assignedSiteId);
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
}

// -- Tariff rules -------------------------------------------------------

export async function createTariffRule(formData: FormData) {
  const vehicle_category = formData.get("vehicle_category")?.toString().trim();
  const pricing_type = formData.get("pricing_type")?.toString();
  const surgeRaw = formData.get("surge_multiplier")?.toString().trim();
  if (!vehicle_category || !pricing_type) return;

  const session = await assertParkingAdmin();

  let rate: number;
  let slab_tiers: { upto_minutes: number | null; rate: number }[] | null = null;

  if (pricing_type === "slab") {
    slab_tiers = [0, 1, 2]
      .map((i) => {
        const rateRaw = formData.get(`slab_rate_${i}`)?.toString().trim();
        if (!rateRaw) return null;
        const uptoRaw = formData.get(`slab_upto_minutes_${i}`)?.toString().trim();
        return { upto_minutes: uptoRaw ? Number(uptoRaw) : null, rate: Number(rateRaw) };
      })
      .filter((t): t is { upto_minutes: number | null; rate: number } => t !== null);
    if (!slab_tiers.length) return;
    rate = slab_tiers[0].rate;
  } else {
    const rateRaw = formData.get("rate")?.toString().trim();
    if (!rateRaw) return;
    rate = Number(rateRaw);
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("tariff_rules").insert({
    parking_space_id: session.assignedSiteId,
    vehicle_category,
    pricing_type,
    rate,
    surge_multiplier: surgeRaw ? Number(surgeRaw) : null,
    slab_tiers,
  });
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
}

export async function deleteTariffRule(formData: FormData) {
  const id = formData.get("id")?.toString();
  if (!id) return;

  const session = await assertParkingAdmin();
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("tariff_rules")
    .delete()
    .eq("id", id)
    .eq("parking_space_id", session.assignedSiteId);
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
}
