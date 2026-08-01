"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

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

// Friendly pre-check on top of the DB's parking_spaces_enforce_site_cap
// trigger (the trigger is the real authority -- parking_spaces has live RLS,
// no service-role bypass -- this just turns a raw Postgres exception into a
// readable message before it gets there).
async function assertSiteCapNotExceeded(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string
) {
  const { data: org } = await supabase
    .from("organizations")
    .select("name, subscription_plans(name, max_locations)")
    .eq("id", organizationId)
    .single<{ name: string; subscription_plans: { name: string; max_locations: number } | null }>();
  const plan = org?.subscription_plans;
  if (!plan) return;

  const { count } = await supabase
    .from("parking_spaces")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);
  if ((count ?? 0) >= plan.max_locations) {
    throw new Error(
      `${org?.name}'s plan (${plan.name}) allows up to ${plan.max_locations} sites; it already has ${count}.`
    );
  }
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
  await assertSiteCapNotExceeded(supabase, organization_id);
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

// parking_admin creation moved to the org page (parking-admin-actions.ts's
// createParkingAdminAccount) where a multi-site checkbox list can be shown --
// an account may now be assigned to more than one of the org's sites.

export async function assignOrganizationPlan(formData: FormData) {
  const organization_id = formData.get("organization_id")?.toString();
  const subscription_plan_id = formData.get("subscription_plan_id")?.toString() || null;
  if (!organization_id) return;

  await assertSuperAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ subscription_plan_id })
    .eq("id", organization_id);
  if (error) throw new Error(error.message);

  revalidatePath(`${PATH}/${organization_id}`);
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
  const surgeRaw = formData.get("surge_multiplier")?.toString().trim();
  if (!parking_space_id || !pricing_type) return;

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

  const supabase = await createClient();
  const { error } = await supabase.from("tariff_rules").insert({
    parking_space_id,
    vehicle_category,
    pricing_type,
    rate,
    surge_multiplier: surgeRaw ? Number(surgeRaw) : null,
    slab_tiers,
  });
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
  // Parking Admin's Live Queue reads tariff_rules through a cached fetcher
  // (getCachedTariffRules in lib/parking-admin/queue.ts) -- this is the second,
  // independent write path to that table, so it needs the same invalidation
  // or an edit made here would silently go stale on the Parking Admin side.
  updateTag(`tariff-rules:${parking_space_id}`);
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

export async function deleteOrganization(formData: FormData) {
  const id = formData.get("id")?.toString();
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase.from("organizations").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
  redirect(PATH);
}

export async function deleteParkingSpace(formData: FormData) {
  const id = formData.get("id")?.toString();
  const organization_id = formData.get("organization_id")?.toString();
  if (!id || !organization_id) return;

  // valet_accounts.assigned_site_id is `on delete cascade`. For a
  // single-site parking_admin that's correct (deleting their only site
  // should delete their account). But for a multi-site admin whose
  // *default* site happens to be the one being deleted, the cascade would
  // wipe their whole account -- including access to sites unrelated to this
  // delete. Reassign their default site to one of their other sites first
  // so only the deleted site's own valet_admin_sites row goes away.
  const service = createServiceClient();
  const { data: affectedAdmins } = await service
    .from("valet_accounts")
    .select("id, valet_admin_sites(site_id)")
    .eq("role", "parking_admin")
    .eq("assigned_site_id", id);
  for (const admin of affectedAdmins ?? []) {
    const otherSiteId = (admin.valet_admin_sites as { site_id: string }[] | null)?.find(
      (s) => s.site_id !== id
    )?.site_id;
    if (otherSiteId) {
      await service.from("valet_accounts").update({ assigned_site_id: otherSiteId }).eq("id", admin.id);
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.from("parking_spaces").delete().eq("id", id);
  if (error) throw new Error(error.message);

  const parentPath = `${PATH}/${organization_id}`;
  revalidatePath(parentPath);
  redirect(parentPath);
}

export async function deleteZone(formData: FormData) {
  const id = formData.get("id")?.toString();
  const organization_id = formData.get("organization_id")?.toString();
  const parking_space_id = formData.get("parking_space_id")?.toString();
  if (!id || !organization_id || !parking_space_id) return;

  const supabase = await createClient();
  const { error } = await supabase.from("zones").delete().eq("id", id);
  if (error) throw new Error(error.message);

  const parentPath = `${PATH}/${organization_id}/${parking_space_id}`;
  revalidatePath(parentPath);
  redirect(parentPath);
}

export async function deleteSlot(formData: FormData) {
  const id = formData.get("id")?.toString();
  const organization_id = formData.get("organization_id")?.toString();
  const parking_space_id = formData.get("parking_space_id")?.toString();
  const zone_id = formData.get("zone_id")?.toString();
  if (!id || !organization_id || !parking_space_id || !zone_id) return;

  const supabase = await createClient();
  const { error } = await supabase.from("slots").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`${PATH}/${organization_id}/${parking_space_id}/${zone_id}`);
}
