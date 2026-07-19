import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { markAsParked } from "@/lib/parking-admin/queue";
import { requireApiSession } from "@/lib/parking-admin/api-auth";
import { AppError, errorResponse } from "@/lib/parking-admin/errors";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiSession(req);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const slotId = typeof body.slotId === "string" ? body.slotId : "";
    if (!slotId) throw new AppError("invalid_request", "slotId is required.", 400);

    const supabase = createServiceClient();
    await markAsParked(supabase, session, id, slotId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
