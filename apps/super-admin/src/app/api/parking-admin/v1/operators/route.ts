import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireApiSession, requireApiParkingAdmin } from "@/lib/parking-admin/api-auth";
import { errorResponse, AppError } from "@/lib/parking-admin/errors";
import { getCurrentSiteId } from "@/lib/valet-auth/session";
import { listOperators, createOperator, type OperatorFields } from "@/lib/parking-admin/operators";

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

export async function GET(req: Request) {
  try {
    const session = await requireApiSession(req);
    requireApiParkingAdmin(session);
    const operators = await listOperators(createServiceClient(), getCurrentSiteId(session));

    return NextResponse.json({
      operators: operators.map((op) => ({
        id: op.id,
        username: op.username,
        fullName: op.full_name,
        employeeId: op.employee_id,
        email: op.email,
        phone: op.phone,
        isActive: op.is_active,
        drivingLicenseExpiry: op.driving_license_expiry,
        dailyStatus: op.dailyStatus,
      })),
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireApiSession(req);
    requireApiParkingAdmin(session);

    const formData = await req.formData();
    const fields = readOperatorFields(formData);
    if (!fields.username || !fields.password) {
      throw new AppError("invalid_request", "username and password are required.", 400);
    }

    const supabase = createServiceClient();
    const siteId = getCurrentSiteId(session);
    const id = await createOperator(supabase, siteId, session.accountId, fields, formData);

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
