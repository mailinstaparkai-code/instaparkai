import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireApiSession, requireApiParkingAdmin } from "@/lib/parking-admin/api-auth";
import { errorResponse, AppError } from "@/lib/parking-admin/errors";
import { generateQrCodes } from "@/lib/parking-admin/qr-codes";

export async function POST(req: Request) {
  try {
    const session = await requireApiSession(req);
    requireApiParkingAdmin(session);

    const body = await req.json().catch(() => null);
    const count = Number(body?.count);
    if (!count) throw new AppError("invalid_request", "count is required.", 400);

    const codes = await generateQrCodes(createServiceClient(), session, count);
    return NextResponse.json(
      { qrCodes: codes.map((c) => ({ id: c.id, code: c.code, createdAt: c.created_at })) },
      { status: 201 }
    );
  } catch (err) {
    return errorResponse(err);
  }
}
