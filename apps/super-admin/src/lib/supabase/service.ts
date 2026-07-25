import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client: bypasses RLS entirely. Only for server-side code paths
 * (Server Actions / Route Handlers) that enforce authorization themselves --
 * e.g. the valet_accounts/valet_sessions tables, which have no RLS policies
 * for anon/authenticated by design (see the valet_auth migration).
 */
function buildServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Typed off buildServiceClient (not `typeof createSupabaseClient`) so the
// concrete instantiated client type survives -- annotating with the raw factory's
// ReturnType drops the generics and collapses every table row to `never`.
let client: ReturnType<typeof buildServiceClient> | null = null;

/**
 * Reused across calls rather than rebuilt each time. There are ~75 call sites and
 * several fire per request, and each `createClient` allocates a fresh set of
 * PostgREST/Auth/Storage sub-clients. Safe to share: this client is stateless by
 * construction (`persistSession: false`, `autoRefreshToken: false`) and always
 * acts as the same service-role principal, so there is no per-user state that
 * could leak between requests -- unlike the cookie-bound `server.ts` client,
 * which must stay per-request.
 */
export function createServiceClient() {
  client ??= buildServiceClient();
  return client;
}
