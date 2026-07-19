import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { voidTicket } from "@/lib/parking-admin/queue";
import { requireApiSession } from "@/lib/parking-admin/api-auth";
import { errorResponse } from "@/lib/parking-admin/errors";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiSession(req);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : null;

    const supabase = createServiceClient();
    await voidTicket(supabase, session, id, reason);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
