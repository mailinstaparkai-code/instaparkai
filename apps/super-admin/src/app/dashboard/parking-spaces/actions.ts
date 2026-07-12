"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const PATH = "/dashboard/parking-spaces";

export async function createOrganization(formData: FormData) {
  const name = formData.get("name")?.toString().trim();
  if (!name) return;

  const supabase = await createClient();
  const { error } = await supabase.from("organizations").insert({ name });
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
}

export async function createParkingSpace(formData: FormData) {
  const organization_id = formData.get("organization_id")?.toString();
  const name = formData.get("name")?.toString().trim();
  const type = formData.get("type")?.toString();
  const address = formData.get("address")?.toString().trim() || null;
  const timezone = formData.get("timezone")?.toString().trim() || "UTC";
  if (!organization_id || !name || !type) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("parking_spaces")
    .insert({ organization_id, name, type, address, timezone });
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
