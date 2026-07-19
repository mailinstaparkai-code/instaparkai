import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { setAutoAllocate } from "@/lib/parking-admin/queue";
import { requireApiSession, requireApiParkingAdmin } from "@/lib/parking-admin/api-auth";
import { errorResponse } from "@/lib/parking-admin/errors";

export async function PATCH(req: Request) {
  try {
    const session = await requireApiSession(req);
    requireApiParkingAdmin(session);
    const body = await req.json().catch(() => ({}));
    const enabled = body.enabled === true;

    const supabase = createServiceClient();
    await setAutoAllocate(supabase, session, enabled);

    return NextResponse.json({ ok: true, enabled });
  } catch (err) {
    return errorResponse(err);
  }
}
