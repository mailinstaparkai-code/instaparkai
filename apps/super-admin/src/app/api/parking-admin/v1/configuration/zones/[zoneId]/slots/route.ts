import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireApiSession, requireApiParkingAdmin } from "@/lib/parking-admin/api-auth";
import { errorResponse, AppError } from "@/lib/parking-admin/errors";
import { getCurrentSiteId } from "@/lib/valet-auth/session";
import { createSlot, mapSlotForApi } from "@/lib/parking-admin/configuration";

export async function POST(req: Request, { params }: { params: Promise<{ zoneId: string }> }) {
  try {
    const session = await requireApiSession(req);
    requireApiParkingAdmin(session);
    const { zoneId } = await params;

    const body = await req.json().catch(() => null);
    const slotNumber = typeof body?.slotNumber === "string" ? body.slotNumber.trim() : "";
    if (!slotNumber) throw new AppError("invalid_request", "slotNumber is required.", 400);

    const slot = await createSlot(createServiceClient(), getCurrentSiteId(session), zoneId, {
      slot_number: slotNumber,
      is_ev: body?.isEv === true,
      is_disabled_slot: body?.isDisabledSlot === true,
    });
    return NextResponse.json({ slot: mapSlotForApi(slot) }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
