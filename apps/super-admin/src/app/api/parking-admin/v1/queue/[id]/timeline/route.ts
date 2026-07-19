import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getTicketTimeline } from "@/lib/parking-admin/queue";
import { requireApiSession } from "@/lib/parking-admin/api-auth";
import { errorResponse } from "@/lib/parking-admin/errors";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiSession(req);
    const { id } = await params;

    const supabase = createServiceClient();
    const timeline = await getTicketTimeline(supabase, session, id);

    return NextResponse.json({
      timeline: timeline.map((t) => ({
        key: t.key,
        type: t.type,
        timestamp: t.timestamp,
        vehicleNumber: t.vehicleNumber,
        operator: t.operator ? { username: t.operator.username, fullName: t.operator.full_name } : null,
        fare: t.fare,
        paymentCollected: t.paymentCollected,
      })),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
