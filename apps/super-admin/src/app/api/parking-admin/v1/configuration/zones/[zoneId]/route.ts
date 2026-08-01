import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireApiSession, requireApiParkingAdmin } from "@/lib/parking-admin/api-auth";
import { errorResponse } from "@/lib/parking-admin/errors";
import { getCurrentSiteId } from "@/lib/valet-auth/session";
import { deleteZone } from "@/lib/parking-admin/configuration";

export async function DELETE(req: Request, { params }: { params: Promise<{ zoneId: string }> }) {
  try {
    const session = await requireApiSession(req);
    requireApiParkingAdmin(session);
    const { zoneId } = await params;
    await deleteZone(createServiceClient(), getCurrentSiteId(session), zoneId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
