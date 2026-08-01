import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireApiSession, requireApiParkingAdmin } from "@/lib/parking-admin/api-auth";
import { errorResponse, AppError } from "@/lib/parking-admin/errors";
import { getCurrentSiteId } from "@/lib/valet-auth/session";
import { listVehicleTypes, createVehicleType } from "@/lib/parking-admin/configuration";

export async function GET(req: Request) {
  try {
    const session = await requireApiSession(req);
    requireApiParkingAdmin(session);
    const vehicleTypes = await listVehicleTypes(createServiceClient(), getCurrentSiteId(session));
    return NextResponse.json({ vehicleTypes });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireApiSession(req);
    requireApiParkingAdmin(session);

    const body = await req.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) throw new AppError("invalid_request", "name is required.", 400);

    const vehicleType = await createVehicleType(createServiceClient(), getCurrentSiteId(session), name);
    return NextResponse.json({ vehicleType }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
