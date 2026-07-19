import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { markArrived } from "@/lib/parking-admin/queue";
import { requireApiSession } from "@/lib/parking-admin/api-auth";
import { errorResponse } from "@/lib/parking-admin/errors";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiSession(req);
    const { id } = await params;

    const supabase = createServiceClient();
    await markArrived(supabase, session, id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
