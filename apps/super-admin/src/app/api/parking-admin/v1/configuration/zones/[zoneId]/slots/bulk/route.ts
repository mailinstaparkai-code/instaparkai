import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireApiSession, requireApiParkingAdmin } from "@/lib/parking-admin/api-auth";
import { errorResponse, AppError } from "@/lib/parking-admin/errors";
import { getCurrentSiteId } from "@/lib/valet-auth/session";
import { createSlotsBulk, mapSlotForApi } from "@/lib/parking-admin/configuration";

export async function POST(req: Request, { params }: { params: Promise<{ zoneId: string }> }) {
  try {
    const session = await requireApiSession(req);
    requireApiParkingAdmin(session);
    const { zoneId } = await params;

    const body = await req.json().catch(() => null);
    const prefix = typeof body?.prefix === "string" ? body.prefix.trim() : "";
    const start = Number(body?.start);
    const end = Number(body?.end);
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      throw new AppError("invalid_request", "start and end are required.", 400);
    }

    const slots = await createSlotsBulk(createServiceClient(), getCurrentSiteId(session), zoneId, {
      prefix,
      start,
      end,
      is_ev: body?.isEv === true,
      is_disabled_slot: body?.isDisabledSlot === true,
    });
    return NextResponse.json({ slots: (slots ?? []).map(mapSlotForApi) }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
