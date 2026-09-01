import "server-only";
import type { createServiceClient } from "@/lib/supabase/service";

// Service-role-client-based (this is the parking_admin/valet_operator request
// path, which always uses createServiceClient(), never the cookie-bound client) --
// kept separate from lib/marketplace.ts (typed for the Super Admin portal's
// cookie-bound client) to preserve this repo's existing two-auth-model file
// separation, even though both read the same tables.

type AnprProvider = {
  adapterKey: string;
  apiKey: string;
  endpointUrl: string | null;
};

// Only an app with both a working code adapter (adapter_key) AND a configured
// api_key is ever a candidate -- a catalog-only app like Circuit Digest (no
// adapter_key) or an unconfigured one (no api_key) is never selected, regardless
// of whether it's "enabled" for this organization.
//
// Two simple sequential queries rather than one deeply-nested PostgREST embed:
// these tables are tens of rows at most (this app's own Performance notes), so
// the extra round trip costs nothing measurable, and it keeps the filter logic
// unambiguous rather than relying on multi-level embedded-column dot-filters.
export async function resolveAnprProvider(
  supabase: ReturnType<typeof createServiceClient>,
  organizationId: string
): Promise<AnprProvider | null> {
  const { data: category } = await supabase
    .from("marketplace_categories")
    .select("id")
    .eq("key", "anpr")
    .maybeSingle();
  if (!category) return null;

  const { data: assignments } = await supabase
    .from("organization_app_assignments")
    .select("marketplace_apps(category_id, adapter_key, api_key, endpoint_url)")
    .eq("organization_id", organizationId)
    .eq("enabled", true);
  if (!assignments?.length) return null;

  for (const row of assignments) {
    const app = Array.isArray(row.marketplace_apps) ? row.marketplace_apps[0] : row.marketplace_apps;
    if (app?.category_id === category.id && app.adapter_key && app.api_key) {
      return { adapterKey: app.adapter_key, apiKey: app.api_key, endpointUrl: app.endpoint_url };
    }
  }
  return null;
}

const KOTAI_DEFAULT_ENDPOINT = "https://kotaielectronics.com/anprdemo/api/anpr_plate_reader.php";

type KotaiResponse = {
  results?: { plate?: string }[];
  // Kotai's demo endpoint returns HTTP 200 even for a real failure -- an invalid
  // key or an exhausted free-trial quota both come back as `{status: false,
  // message: "..."}` with no `results` field at all, which a bare `!res.ok` check
  // (and a bare "no results means no plate" read) would silently treat as a clean
  // "nothing found" instead of the real error it is. Confirmed live: a broken key
  // produced exactly this shape ("You have reached your free trial!").
  status?: boolean;
  message?: string;
};

export async function extractPlateViaKotai(
  buffer: Buffer,
  apiKey: string,
  endpointUrl?: string | null
): Promise<string | null> {
  const body = new FormData();
  // Kotai's field name is `image`, not `file` -- different from OCR.space.
  body.set("image", new Blob([new Uint8Array(buffer)], { type: "image/jpeg" }), "capture.jpg");

  const res = await fetch(endpointUrl || KOTAI_DEFAULT_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body,
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    throw new Error(`Kotai ANPR request failed with HTTP ${res.status}`);
  }

  const data = (await res.json()) as KotaiResponse;
  if (data.status === false) {
    throw new Error(`Kotai ANPR request failed: ${data.message ?? "unknown error"}`);
  }

  const plate = data.results?.[0]?.plate;
  return plate ? plate.toUpperCase() : null;
}

type FastAlprResponse = {
  found: boolean;
  plate?: string;
};

// Self-hosted fast-alpr (see /alpr-service at the repo root) -- unlike Kotai/
// CarmenCloud this isn't a third-party vendor, so there's no per-call quota to
// exhaust; `apiKey` here is a shared secret this deployment controls, not
// something issued by an external provider.
export async function extractPlateViaFastAlpr(
  buffer: Buffer,
  apiKey: string,
  endpointUrl: string
): Promise<string | null> {
  const body = new FormData();
  body.set("file", new Blob([new Uint8Array(buffer)], { type: "image/jpeg" }), "capture.jpg");

  const res = await fetch(endpointUrl, {
    method: "POST",
    headers: { "X-Api-Key": apiKey },
    body,
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    throw new Error(`FastALPR request failed with HTTP ${res.status}`);
  }

  const data = (await res.json()) as FastAlprResponse;
  return data.found && data.plate ? data.plate.toUpperCase() : null;
}
