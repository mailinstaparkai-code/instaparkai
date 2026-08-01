import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireApiSession, requireApiParkingAdmin } from "@/lib/parking-admin/api-auth";
import { errorResponse, AppError } from "@/lib/parking-admin/errors";
import { getCurrentSiteId } from "@/lib/valet-auth/session";
import { listQrCodes, setGuestRequestMode } from "@/lib/parking-admin/qr-codes";

export async function GET(req: Request) {
  try {
    const session = await requireApiSession(req);
    requireApiParkingAdmin(session);
    const supabase = createServiceClient();

    const [{ data: site }, qrCodes] = await Promise.all([
      supabase
        .from("parking_spaces")
        .select("guest_request_mode")
        .eq("id", getCurrentSiteId(session))
        .single(),
      listQrCodes(supabase, session),
    ]);

    return NextResponse.json({
      guestRequestMode: (site?.guest_request_mode as "link" | "qr" | undefined) ?? "link",
      qrCodes: qrCodes.map((c) => ({
        id: c.id,
        code: c.code,
        createdAt: c.created_at,
        inUse: c.inUse,
        ticket: c.ticket
          ? { id: c.ticket.id, vehicleNumber: c.ticket.vehicle_number, status: c.ticket.status }
          : null,
      })),
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireApiSession(req);
    requireApiParkingAdmin(session);

    const body = await req.json().catch(() => null);
    const mode = body?.mode === "qr" ? "qr" : body?.mode === "link" ? "link" : null;
    if (!mode) throw new AppError("invalid_request", "mode must be 'link' or 'qr'.", 400);

    await setGuestRequestMode(createServiceClient(), session, mode);
    return NextResponse.json({ guestRequestMode: mode });
  } catch (err) {
    return errorResponse(err);
  }
}
