"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { hashPassword } from "@/lib/valet-auth/password";

const PATH = "/dashboard/parking-spaces";

async function assertSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "super_admin") throw new Error("Super Admin access required.");
}

export async function createOrganization(formData: FormData) {
  const name = formData.get("name")?.toString().trim();
  if (!name) return;

  const supabase = await createClient();
  const { error } = await supabase.from("organizations").insert({ name });
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
}

function parseLatLng(formData: FormData) {
  const latRaw = formData.get("latitude")?.toString().trim();
  const lngRaw = formData.get("longitude")?.toString().trim();
  return {
    latitude: latRaw ? Number(latRaw) : null,
    longitude: lngRaw ? Number(lngRaw) : null,
  };
}

export async function createParkingSpace(formData: FormData) {
  const organization_id = formData.get("organization_id")?.toString();
  const name = formData.get("name")?.toString().trim();
  const type = formData.get("type")?.toString();
  const address = formData.get("address")?.toString().trim() || null;
  const timezone = formData.get("timezone")?.toString().trim() || "UTC";
  const valet_parking_enabled = formData.get("valet_parking_enabled") === "on";
  if (!organization_id || !name || !type) return;

  const supabase = await createClient();
  const { error } = await supabase.from("parking_spaces").insert({
    organization_id,
    name,
    type,
    address,
    timezone,
    valet_parking_enabled,
    ...parseLatLng(formData),
  });
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
}

export async function updateParkingSpace(formData: FormData) {
  const id = formData.get("id")?.toString();
  const name = formData.get("name")?.toString().trim();
  const type = formData.get("type")?.toString();
  const address = formData.get("address")?.toString().trim() || null;
  const timezone = formData.get("timezone")?.toString().trim() || "UTC";
  const valet_parking_enabled = formData.get("valet_parking_enabled") === "on";
  if (!id || !name || !type) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("parking_spaces")
    .update({
      name,
      type,
      address,
      timezone,
      valet_parking_enabled,
      ...parseLatLng(formData),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
}

export async function createParkingAdmin(formData: FormData) {
  const parking_space_id = formData.get("parking_space_id")?.toString();
  const username = formData.get("username")?.toString().trim();
  const password = formData.get("password")?.toString();
  const full_name = formData.get("full_name")?.toString().trim() || null;
  if (!parking_space_id || !username || !password) return;

  await assertSuperAdmin();

  const supabase = createServiceClient();
  const { error } = await supabase.from("valet_accounts").insert({
    username,
    password_hash: hashPassword(password),
    role: "parking_admin",
    assigned_site_id: parking_space_id,
    full_name,
  });
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
}

export async function createZone(formData: FormData) {
  const parking_space_id = formData.get("parking_space_id")?.toString();
  const name = formData.get("name")?.toString().trim();
  if (!parking_space_id || !name) return;

  const supabase = await createClient();
  const { error } = await supabase.from("zones").insert({ parking_space_id, name });
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
}

export async function setAccessWorkflow(formData: FormData) {
  const parking_space_id = formData.get("parking_space_id")?.toString();
  const primary = formData.get("primary_method")?.toString();
  const fallback = formData.get("fallback_method")?.toString();
  if (!parking_space_id || !primary) return;

  const methods = [primary, ...(fallback && fallback !== primary ? [fallback] : [])];

  const supabase = await createClient();
  const { error } = await supabase
    .from("access_workflows")
    .upsert({ parking_space_id, methods }, { onConflict: "parking_space_id" });
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
}

export async function createTariffRule(formData: FormData) {
  const parking_space_id = formData.get("parking_space_id")?.toString();
  const vehicle_category = formData.get("vehicle_category")?.toString().trim() || "car";
  const pricing_type = formData.get("pricing_type")?.toString();
  const rateRaw = formData.get("rate")?.toString().trim();
  const surgeRaw = formData.get("surge_multiplier")?.toString().trim();
  if (!parking_space_id || !pricing_type || !rateRaw) return;

  const supabase = await createClient();
  const { error } = await supabase.from("tariff_rules").insert({
    parking_space_id,
    vehicle_category,
    pricing_type,
    rate: Number(rateRaw),
    surge_multiplier: surgeRaw ? Number(surgeRaw) : null,
  });
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
}

export async function createSlot(formData: FormData) {
  const zone_id = formData.get("zone_id")?.toString();
  const slot_number = formData.get("slot_number")?.toString().trim();
  const category = formData.get("category")?.toString() || "regular";
  const is_ev = formData.get("is_ev") === "on";
  const is_disabled_slot = formData.get("is_disabled_slot") === "on";
  if (!zone_id || !slot_number) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("slots")
    .insert({ zone_id, slot_number, category, is_ev, is_disabled_slot });
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
}
