import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { dispatchVehicle } from "@/lib/parking-admin/queue";
import { requireApiSession } from "@/lib/parking-admin/api-auth";
import { AppError, errorResponse } from "@/lib/parking-admin/errors";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiSession(req);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const operatorId = typeof body.operatorId === "string" ? body.operatorId : "";
    if (!operatorId) throw new AppError("invalid_request", "operatorId is required.", 400);

    const supabase = createServiceClient();
    await dispatchVehicle(supabase, session, id, operatorId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
