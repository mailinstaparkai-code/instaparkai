import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireApiSession, requireApiParkingAdmin } from "@/lib/parking-admin/api-auth";
import { errorResponse, AppError } from "@/lib/parking-admin/errors";
import { getCurrentSiteId } from "@/lib/valet-auth/session";
import { listVehiclePasses, createVehiclePass, mapVehiclePassForApi } from "@/lib/parking-admin/configuration";

export async function GET(req: Request) {
  try {
    const session = await requireApiSession(req);
    requireApiParkingAdmin(session);
    const vehiclePasses = await listVehiclePasses(createServiceClient(), getCurrentSiteId(session));
    return NextResponse.json({ vehiclePasses: vehiclePasses.map(mapVehiclePassForApi) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireApiSession(req);
    requireApiParkingAdmin(session);

    const body = await req.json().catch(() => null);
    const vehicleNumber = typeof body?.vehicleNumber === "string" ? body.vehicleNumber.trim() : "";
    const label = typeof body?.label === "string" ? body.label.trim() || null : null;
    if (!vehicleNumber) throw new AppError("invalid_request", "vehicleNumber is required.", 400);

    const vehiclePass = await createVehiclePass(createServiceClient(), getCurrentSiteId(session), vehicleNumber, label);
    return NextResponse.json({ vehiclePass: mapVehiclePassForApi(vehiclePass) }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
