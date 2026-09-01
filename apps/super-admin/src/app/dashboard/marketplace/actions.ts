"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  updateMarketplaceAppApiKey,
  listOrganizationAssignments,
  setOrganizationAppAssignment,
  type OrganizationAssignmentRow,
} from "@/lib/marketplace";

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

export async function updateAppApiKey(formData: FormData) {
  const appId = formData.get("app_id")?.toString();
  const categoryKey = formData.get("category_key")?.toString();
  const apiKey = formData.get("api_key")?.toString().trim();
  if (!appId || !categoryKey || !apiKey) return;

  await assertSuperAdmin();
  const supabase = await createClient();
  await updateMarketplaceAppApiKey(supabase, appId, apiKey);

  revalidatePath(`/dashboard/marketplace/${categoryKey}`);
}

export async function toggleAppAssignment(formData: FormData) {
  const organizationId = formData.get("organization_id")?.toString();
  const appId = formData.get("app_id")?.toString();
  const categoryKey = formData.get("category_key")?.toString();
  const enabled = formData.get("enabled") === "true";
  if (!organizationId || !appId || !categoryKey) return;

  await assertSuperAdmin();
  const supabase = await createClient();
  await setOrganizationAppAssignment(supabase, organizationId, appId, enabled);

  revalidatePath(`/dashboard/marketplace/${categoryKey}`);
}

// Data-returning Server Action (not a mutation) -- called lazily from the client
// manage-app dialog's onOpen handler so the org list is fetched per app on demand,
// not preloaded for every app on the category page. No unstable_cache/tag involved
// here, so the updateTag-vs-revalidateTag rule doesn't apply to this function.
export async function fetchOrganizationAssignments(
  appId: string
): Promise<OrganizationAssignmentRow[]> {
  await assertSuperAdmin();
  const supabase = await createClient();
  return listOrganizationAssignments(supabase, appId);
}
