import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getBearerToken, requireApiSession, requireApiParkingAdmin } from "@/lib/parking-admin/api-auth";
import { errorResponse, AppError } from "@/lib/parking-admin/errors";
import { hashToken } from "@/lib/valet-auth/session";

// parking_admin-only, mirrors the web's switchSite Server Action
// (lib/valet-auth/site-switch.ts) but operates on the bearer token's
// valet_sessions row instead of a cookie -- each device gets its own
// current_site_id, so switching on Android never affects a web session for
// the same account.
export async function POST(req: Request) {
  try {
    const session = await requireApiSession(req);
    requireApiParkingAdmin(session);

    const body = await req.json().catch(() => null);
    const siteId = typeof body?.siteId === "string" ? body.siteId : null;
    if (!siteId) throw new AppError("invalid_request", "siteId is required.", 400);
    if (!session.accessibleSiteIds.includes(siteId)) {
      throw new AppError("forbidden", "You don't have access to that site.", 403);
    }

    const token = getBearerToken(req)!;
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("valet_sessions")
      .update({ current_site_id: siteId })
      .eq("token_hash", hashToken(token));
    if (error) throw new AppError("update_failed", error.message, 400);

    return NextResponse.json({ currentSiteId: siteId });
  } catch (err) {
    return errorResponse(err);
  }
}
