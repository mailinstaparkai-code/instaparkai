import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { markAllNotificationsRead } from "@/lib/parking-admin/notifications";
import { requireApiSession } from "@/lib/parking-admin/api-auth";
import { errorResponse } from "@/lib/parking-admin/errors";
import { getCurrentSiteId } from "@/lib/valet-auth/session";

export async function POST(req: Request) {
  try {
    const session = await requireApiSession(req);
    const supabase = createServiceClient();
    await markAllNotificationsRead(supabase, getCurrentSiteId(session));

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
