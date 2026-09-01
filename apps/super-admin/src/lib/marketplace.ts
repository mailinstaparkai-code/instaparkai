import "server-only";
import type { createClient } from "@/lib/supabase/server";

// Typed off createClient itself (not a raw SupabaseClient/Database generic) so the
// concrete instantiated client type survives -- see lib/supabase/service.ts's own
// comment on why annotating with a factory's generic return type collapses every
// table row to `never`.
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type MarketplaceCategory = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  sort_order: number;
};

export type MarketplaceAppCard = {
  id: string;
  category_id: string;
  name: string;
  vendor: string;
  description: string | null;
  endpoint_url: string | null;
  is_configured: boolean;
  enabled_assignment_count: number;
};

export type OrganizationAssignmentRow = {
  organization_id: string;
  organization_name: string;
  enabled: boolean;
};

export async function listMarketplaceCategories(
  supabase: SupabaseServerClient
): Promise<MarketplaceCategory[]> {
  const { data, error } = await supabase
    .from("marketplace_categories")
    .select("id, key, name, description, sort_order")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getMarketplaceCategoryByKey(
  supabase: SupabaseServerClient,
  key: string
): Promise<MarketplaceCategory | null> {
  const { data, error } = await supabase
    .from("marketplace_categories")
    .select("id, key, name, description, sort_order")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function listMarketplaceApps(
  supabase: SupabaseServerClient,
  categoryId: string
): Promise<MarketplaceAppCard[]> {
  const { data: apps, error } = await supabase
    .from("marketplace_apps")
    .select("id, category_id, name, vendor, description, endpoint_url, api_key")
    .eq("category_id", categoryId)
    .order("name");
  if (error) throw new Error(error.message);
  if (!apps?.length) return [];

  // A PostgREST count embed can't express "count only enabled rows" (it counts
  // every related row regardless of `enabled`, and a filtered !inner embed would
  // drop apps with zero enabled assignments from the result entirely) -- a second
  // small query is the correct, simple choice here, not a premature optimization
  // (these tables are tens of rows at most, per this app's own Performance notes).
  const appIds = apps.map((a) => a.id);
  const { data: assignments, error: assignmentsError } = await supabase
    .from("organization_app_assignments")
    .select("app_id")
    .in("app_id", appIds)
    .eq("enabled", true);
  if (assignmentsError) throw new Error(assignmentsError.message);

  const countByAppId = new Map<string, number>();
  for (const row of assignments ?? []) {
    countByAppId.set(row.app_id, (countByAppId.get(row.app_id) ?? 0) + 1);
  }

  return apps.map((app) => ({
    id: app.id,
    category_id: app.category_id,
    name: app.name,
    vendor: app.vendor,
    description: app.description,
    endpoint_url: app.endpoint_url,
    is_configured: Boolean(app.api_key),
    enabled_assignment_count: countByAppId.get(app.id) ?? 0,
  }));
}

export async function updateMarketplaceAppApiKey(
  supabase: SupabaseServerClient,
  appId: string,
  apiKey: string
): Promise<void> {
  const { error } = await supabase
    .from("marketplace_apps")
    .update({ api_key: apiKey })
    .eq("id", appId);
  if (error) throw new Error(error.message);
}

export async function listOrganizationAssignments(
  supabase: SupabaseServerClient,
  appId: string
): Promise<OrganizationAssignmentRow[]> {
  const { data: organizations, error } = await supabase
    .from("organizations")
    .select("id, name")
    .order("name");
  if (error) throw new Error(error.message);

  const { data: assignments, error: assignmentsError } = await supabase
    .from("organization_app_assignments")
    .select("organization_id, enabled")
    .eq("app_id", appId);
  if (assignmentsError) throw new Error(assignmentsError.message);

  const enabledByOrgId = new Map(
    (assignments ?? []).map((a) => [a.organization_id, a.enabled])
  );

  return (organizations ?? []).map((org) => ({
    organization_id: org.id,
    organization_name: org.name,
    // No assignment row yet means never assigned -- defaults to off, not an error.
    enabled: enabledByOrgId.get(org.id) ?? false,
  }));
}

export async function setOrganizationAppAssignment(
  supabase: SupabaseServerClient,
  organizationId: string,
  appId: string,
  enabled: boolean
): Promise<void> {
  const { error } = await supabase
    .from("organization_app_assignments")
    .upsert(
      { organization_id: organizationId, app_id: appId, enabled },
      { onConflict: "organization_id,app_id" }
    );
  if (error) throw new Error(error.message);
}
