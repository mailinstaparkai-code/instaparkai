"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { hashPassword } from "@/lib/valet-auth/password";

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

function parseSiteIds(formData: FormData): string[] {
  return formData
    .getAll("site_ids")
    .map((v) => v.toString())
    .filter(Boolean);
}

// parking_admin accounts can now be assigned to more than one of their
// organization's sites (valet_admin_sites), unlike valet_operator which
// stays pinned to a single assigned_site_id. This creates the account with
// assigned_site_id set to the first checked site (used as the default/
// fallback site) and writes the full set to valet_admin_sites.
export async function createParkingAdminAccount(formData: FormData) {
  const organization_id = formData.get("organization_id")?.toString();
  const username = formData.get("username")?.toString().trim();
  const password = formData.get("password")?.toString();
  const full_name = formData.get("full_name")?.toString().trim() || null;
  const siteIds = parseSiteIds(formData);
  if (!organization_id || !username || !password || !siteIds.length) return;

  await assertSuperAdmin();
  const supabase = createServiceClient();

  const { data: created, error } = await supabase
    .from("valet_accounts")
    .insert({
      username,
      password_hash: hashPassword(password),
      role: "parking_admin",
      assigned_site_id: siteIds[0],
      full_name,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: sitesError } = await supabase
    .from("valet_admin_sites")
    .insert(siteIds.map((site_id) => ({ account_id: created.id, site_id })));
  if (sitesError) throw new Error(sitesError.message);

  revalidatePath(`/dashboard/parking-spaces/${organization_id}`);
}

// Replaces an account's full site set. Requires at least one site to remain
// selected -- a parking_admin with zero sites can't do anything useful and
// every downstream query assumes accessibleSiteIds is non-empty.
export async function updateParkingAdminSites(formData: FormData) {
  const account_id = formData.get("account_id")?.toString();
  const organization_id = formData.get("organization_id")?.toString();
  const siteIds = parseSiteIds(formData);
  if (!account_id || !organization_id || !siteIds.length) return;

  await assertSuperAdmin();
  const supabase = createServiceClient();

  const { data: account } = await supabase
    .from("valet_accounts")
    .select("assigned_site_id")
    .eq("id", account_id)
    .single();

  const { error: deleteError } = await supabase
    .from("valet_admin_sites")
    .delete()
    .eq("account_id", account_id);
  if (deleteError) throw new Error(deleteError.message);

  const { error: insertError } = await supabase
    .from("valet_admin_sites")
    .insert(siteIds.map((site_id) => ({ account_id, site_id })));
  if (insertError) throw new Error(insertError.message);

  // Keep assigned_site_id (the default/fallback site) in sync -- if it's no
  // longer in the new set, fall back to the first remaining site.
  if (!account?.assigned_site_id || !siteIds.includes(account.assigned_site_id)) {
    const { error: updateError } = await supabase
      .from("valet_accounts")
      .update({ assigned_site_id: siteIds[0] })
      .eq("id", account_id);
    if (updateError) throw new Error(updateError.message);
  }

  revalidatePath(`/dashboard/parking-spaces/${organization_id}`);
}

export async function deleteParkingAdminAccount(formData: FormData) {
  const account_id = formData.get("account_id")?.toString();
  const organization_id = formData.get("organization_id")?.toString();
  if (!account_id || !organization_id) return;

  await assertSuperAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase.from("valet_accounts").delete().eq("id", account_id);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/parking-spaces/${organization_id}`);
}
