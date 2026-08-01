import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireApiSession, requireApiParkingAdmin } from "@/lib/parking-admin/api-auth";
import { errorResponse, AppError } from "@/lib/parking-admin/errors";
import { getCurrentSiteId } from "@/lib/valet-auth/session";
import { setOperatorActive } from "@/lib/parking-admin/operators";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiSession(req);
    requireApiParkingAdmin(session);
    const { id } = await params;

    const body = await req.json().catch(() => null);
    if (typeof body?.isActive !== "boolean") {
      throw new AppError("invalid_request", "isActive must be a boolean.", 400);
    }

    await setOperatorActive(createServiceClient(), getCurrentSiteId(session), id, body.isActive);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
