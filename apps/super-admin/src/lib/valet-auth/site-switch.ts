"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { getValetSession, hashToken } from "@/lib/valet-auth/session";

const COOKIE_NAME = "valet_session";

// parking_admin-only: valet_operator stays pinned to its single
// assigned_site_id, no switcher is ever shown for that role. Persists the
// selection on the current device's valet_sessions row (not a bare cookie),
// so switching on web never affects an Android session for the same
// account, and vice versa.
export async function switchSite(formData: FormData) {
  const siteId = formData.get("site_id")?.toString();
  if (!siteId) return;

  const session = await getValetSession();
  if (!session || session.role !== "parking_admin") {
    throw new Error("Parking Admin access required.");
  }
  if (!session.accessibleSiteIds.includes(siteId)) {
    throw new Error("You don't have access to that site.");
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return;

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("valet_sessions")
    .update({ current_site_id: siteId })
    .eq("token_hash", hashToken(token));
  if (error) throw new Error(error.message);

  revalidatePath("/parking-admin", "layout");
}
