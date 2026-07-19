import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRecentNotifications } from "@/lib/parking-admin/notifications";
import { requireApiSession } from "@/lib/parking-admin/api-auth";
import { errorResponse } from "@/lib/parking-admin/errors";

export async function GET(req: Request) {
  try {
    const session = await requireApiSession(req);
    const supabase = createServiceClient();
    const notifications = await getRecentNotifications(supabase, session.assignedSiteId);

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        kind: n.kind,
        message: n.message,
        readAt: n.read_at,
        createdAt: n.created_at,
      })),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
