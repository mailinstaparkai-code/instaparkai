import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireApiSession } from "@/lib/parking-admin/api-auth";
import { errorResponse } from "@/lib/parking-admin/errors";

export async function GET(req: Request) {
  try {
    const session = await requireApiSession(req);

    const supabase = createServiceClient();
    const { data: site } = await supabase
      .from("parking_spaces")
      .select("name, valet_parking_enabled")
      .eq("id", session.assignedSiteId)
      .maybeSingle();

    return NextResponse.json({
      id: session.accountId,
      username: session.username,
      role: session.role,
      fullName: session.fullName,
      assignedSiteId: session.assignedSiteId,
      siteName: site?.name ?? null,
      valetParkingEnabled: site?.valet_parking_enabled ?? false,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
