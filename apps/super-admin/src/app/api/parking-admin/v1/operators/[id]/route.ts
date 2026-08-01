import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireApiSession, requireApiParkingAdmin } from "@/lib/parking-admin/api-auth";
import { errorResponse, AppError } from "@/lib/parking-admin/errors";
import { getCurrentSiteId } from "@/lib/valet-auth/session";
import { updateOperator, deleteOperator, type OperatorFields } from "@/lib/parking-admin/operators";

function readOperatorFields(formData: FormData): OperatorFields {
  return {
    username: formData.get("username")?.toString().trim() ?? "",
    password: formData.get("password")?.toString() || undefined,
    full_name: formData.get("fullName")?.toString().trim() || null,
    employee_id: formData.get("employeeId")?.toString().trim() || null,
    email: formData.get("email")?.toString().trim() || null,
    phone: formData.get("phone")?.toString().trim() || null,
    driving_license_expiry: formData.get("drivingLicenseExpiry")?.toString().trim() || null,
  };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiSession(req);
    requireApiParkingAdmin(session);
    const { id } = await params;

    const formData = await req.formData();
    const fields = readOperatorFields(formData);
    if (!fields.username) throw new AppError("invalid_request", "username is required.", 400);

    await updateOperator(createServiceClient(), getCurrentSiteId(session), id, fields, formData);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiSession(req);
    requireApiParkingAdmin(session);
    const { id } = await params;
    await deleteOperator(createServiceClient(), getCurrentSiteId(session), id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
