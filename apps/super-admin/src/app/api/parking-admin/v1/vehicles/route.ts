import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { listVehicles, type VehicleTicketRow } from "@/lib/parking-admin/vehicles";
import { requireApiSession } from "@/lib/parking-admin/api-auth";
import { errorResponse } from "@/lib/parking-admin/errors";

function parseCsv(value: string | null): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

function mapTicket(t: VehicleTicketRow) {
  return {
    id: t.id,
    ticketToken: t.ticket_token,
    vehicleNumber: t.vehicle_number,
    vehicleType: t.vehicle_type,
    mobileNumber: t.mobile_number,
    status: t.status,
    checkedInAt: t.checked_in_at,
    completedAt: t.completed_at,
    fareAmount: t.fare_amount,
    paymentCollected: t.payment_collected,
    photoCount: t.check_in_photos.length + t.handover_photos.length,
    slotNumber: t.slots?.slot_number ?? null,
    checkedInOperator: t.checked_in_operator
      ? { username: t.checked_in_operator.username, fullName: t.checked_in_operator.full_name }
      : null,
    deliveredOperator: t.delivered_operator
      ? { username: t.delivered_operator.username, fullName: t.delivered_operator.full_name }
      : null,
  };
}

export async function GET(req: Request) {
  try {
    const session = await requireApiSession(req);
    const url = new URL(req.url);
    const status = parseCsv(url.searchParams.get("status"));
    const vehicleType = parseCsv(url.searchParams.get("vehicle_type"));
    const operator = parseCsv(url.searchParams.get("operator"));
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);

    const supabase = createServiceClient();
    const result = await listVehicles(
      supabase,
      session.assignedSiteId,
      { status, vehicleType, operator },
      page
    );

    return NextResponse.json({
      tickets: result.tickets.map(mapTicket),
      page: result.page,
      totalPages: result.totalPages,
      totalCount: result.totalCount,
      stats: { completedCount: result.completedCount, totalRevenue: result.totalRevenue },
      filters: {
        statusOptions: result.statusOptions,
        vehicleTypeOptions: result.vehicleTypeOptions,
        operatorOptions: result.operatorOptions,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
