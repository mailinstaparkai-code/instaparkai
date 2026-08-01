import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireApiSession, requireApiParkingAdmin } from "@/lib/parking-admin/api-auth";
import { errorResponse, AppError } from "@/lib/parking-admin/errors";
import { getCurrentSiteId } from "@/lib/valet-auth/session";
import { setOperatorDailyStatus } from "@/lib/parking-admin/operators";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiSession(req);
    requireApiParkingAdmin(session);
    const { id } = await params;

    const body = await req.json().catch(() => null);
    const status = typeof body?.status === "string" ? body.status : null;
    if (!status) throw new AppError("invalid_request", "status is required.", 400);

    await setOperatorDailyStatus(createServiceClient(), getCurrentSiteId(session), id, status, session.accountId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
