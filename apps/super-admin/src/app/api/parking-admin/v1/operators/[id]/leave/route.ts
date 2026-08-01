import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireApiSession, requireApiParkingAdmin } from "@/lib/parking-admin/api-auth";
import { errorResponse, AppError } from "@/lib/parking-admin/errors";
import { getCurrentSiteId } from "@/lib/valet-auth/session";
import { setOperatorLeave } from "@/lib/parking-admin/operators";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiSession(req);
    requireApiParkingAdmin(session);
    const { id } = await params;

    const body = await req.json().catch(() => null);
    const startDate = typeof body?.startDate === "string" ? body.startDate : null;
    const endDate = typeof body?.endDate === "string" ? body.endDate : null;
    if (!startDate || !endDate) throw new AppError("invalid_request", "startDate and endDate are required.", 400);

    await setOperatorLeave(createServiceClient(), getCurrentSiteId(session), id, startDate, endDate, session.accountId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
