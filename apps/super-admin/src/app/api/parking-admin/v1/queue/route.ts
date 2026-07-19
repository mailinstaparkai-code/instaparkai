import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getQueueData, type QueueTicket } from "@/lib/parking-admin/queue";
import { requireApiSession } from "@/lib/parking-admin/api-auth";
import { errorResponse } from "@/lib/parking-admin/errors";

function parseCsv(value: string | null): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

export function mapQueueTicket(t: QueueTicket) {
  return {
    id: t.id,
    ticketToken: t.ticket_token,
    vehicleNumber: t.vehicle_number,
    vehicleType: t.vehicle_type,
    mobileNumber: t.mobile_number,
    status: t.status,
    checkedInAt: t.checked_in_at,
    fareAmount: t.fare_amount,
    photoCount: t.check_in_photos.length + t.handover_photos.length,
    slotNumber: t.slots?.slot_number ?? null,
  };
}

export async function GET(req: Request) {
  try {
    const session = await requireApiSession(req);
    const url = new URL(req.url);
    const status = parseCsv(url.searchParams.get("status"));
    const vehicleType = parseCsv(url.searchParams.get("vehicle_type"));

    const supabase = createServiceClient();
    const result = await getQueueData(supabase, session, { status, vehicleType });

    return NextResponse.json({
      tickets: result.tickets.map(mapQueueTicket),
      availableSlots: result.availableSlots,
      operatorOptions: result.operatorOptions,
      filters: {
        statusOptions: result.statusOptions,
        vehicleTypeOptions: result.vehicleTypeOptions,
      },
      autoAllocateEnabled: result.autoAllocateEnabled,
      canToggleAutoAllocate: result.canToggleAutoAllocate,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
