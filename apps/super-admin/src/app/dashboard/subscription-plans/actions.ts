"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const PATH = "/dashboard/subscription-plans";

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

export async function createPlan(formData: FormData) {
  const name = formData.get("name")?.toString().trim();
  const max_locations = Number(formData.get("max_locations"));
  if (!name || !max_locations || max_locations <= 0) return;

  await assertSuperAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("subscription_plans").insert({ name, max_locations });
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
}

export async function updatePlan(formData: FormData) {
  const id = formData.get("id")?.toString();
  const name = formData.get("name")?.toString().trim();
  const max_locations = Number(formData.get("max_locations"));
  if (!id || !name || !max_locations || max_locations <= 0) return;

  await assertSuperAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("subscription_plans")
    .update({ name, max_locations })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
}

export async function setPlanActive(formData: FormData) {
  const id = formData.get("id")?.toString();
  const is_active = formData.get("is_active") === "true";
  if (!id) return;

  await assertSuperAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("subscription_plans").update({ is_active }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
}

// Prefer deactivating a plan still referenced by organizations -- deleting it
// would null out their subscription_plan_id (on delete set null) and quietly
// make them uncapped, which is surprising. Only allow a hard delete once no
// org references it.
export async function deletePlan(formData: FormData) {
  const id = formData.get("id")?.toString();
  if (!id) return;

  await assertSuperAdmin();
  const supabase = await createClient();
  const { count } = await supabase
    .from("organizations")
    .select("id", { count: "exact", head: true })
    .eq("subscription_plan_id", id);
  if (count && count > 0) {
    throw new Error(
      `${count} organization${count === 1 ? " is" : "s are"} on this plan. Deactivate it instead of deleting, or reassign them first.`
    );
  }

  const { error } = await supabase.from("subscription_plans").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
}
