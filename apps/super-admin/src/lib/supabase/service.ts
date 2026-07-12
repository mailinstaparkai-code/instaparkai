import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client: bypasses RLS entirely. Only for server-side code paths
 * (Server Actions / Route Handlers) that enforce authorization themselves --
 * e.g. the valet_accounts/valet_sessions tables, which have no RLS policies
 * for anon/authenticated by design (see the valet_auth migration).
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
