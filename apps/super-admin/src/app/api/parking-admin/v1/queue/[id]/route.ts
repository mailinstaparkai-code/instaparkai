import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { updateTicketDetails } from "@/lib/parking-admin/queue";
import { requireApiSession } from "@/lib/parking-admin/api-auth";
import { errorResponse } from "@/lib/parking-admin/errors";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiSession(req);
    const { id } = await params;
    const body = await req.json();
    const vehicleNumber = typeof body.vehicleNumber === "string" ? body.vehicleNumber : "";
    const mobileNumber = typeof body.mobileNumber === "string" ? body.mobileNumber : "";

    const supabase = createServiceClient();
    await updateTicketDetails(supabase, session, id, { vehicleNumber, mobileNumber });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
