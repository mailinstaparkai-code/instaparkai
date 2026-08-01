import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireApiSession } from "@/lib/parking-admin/api-auth";
import { errorResponse } from "@/lib/parking-admin/errors";
import { getCurrentSiteId } from "@/lib/valet-auth/session";

export async function GET(req: Request) {
  try {
    const session = await requireApiSession(req);

    const supabase = createServiceClient();
    const [{ data: site }, { data: accessibleSites }] = await Promise.all([
      supabase
        .from("parking_spaces")
        .select("name, valet_parking_enabled, guest_request_mode")
        .eq("id", getCurrentSiteId(session))
        .maybeSingle(),
      supabase.from("parking_spaces").select("id, name").in("id", session.accessibleSiteIds).order("name"),
    ]);

    return NextResponse.json({
      id: session.accountId,
      username: session.username,
      role: session.role,
      fullName: session.fullName,
      assignedSiteId: session.assignedSiteId,
      currentSiteId: getCurrentSiteId(session),
      accessibleSites: accessibleSites ?? [],
      siteName: site?.name ?? null,
      valetParkingEnabled: site?.valet_parking_enabled ?? false,
      qrCodeModeEnabled: site?.guest_request_mode === "qr",
    });
  } catch (err) {
    return errorResponse(err);
  }
}
