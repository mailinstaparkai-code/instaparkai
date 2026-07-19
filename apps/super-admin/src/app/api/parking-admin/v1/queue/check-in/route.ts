import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkInVehicle } from "@/lib/parking-admin/queue";
import { requireApiSession } from "@/lib/parking-admin/api-auth";
import { errorResponse } from "@/lib/parking-admin/errors";
import { mapQueueTicket } from "../route";

export async function POST(req: Request) {
  try {
    const session = await requireApiSession(req);
    const formData = await req.formData();
    const vehicleNumber = formData.get("vehicle_number")?.toString() ?? "";
    const vehicleType = formData.get("vehicle_type")?.toString() ?? "car";
    const mobileNumber = formData.get("mobile_number")?.toString() ?? "";

    const supabase = createServiceClient();
    const ticket = await checkInVehicle(
      supabase,
      session,
      { vehicleNumber, vehicleType, mobileNumber },
      formData
    );

    return NextResponse.json({ ticket: mapQueueTicket(ticket) }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
