import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getDashboardSummary } from "@/lib/parking-admin/dashboard";
import { requireApiSession } from "@/lib/parking-admin/api-auth";
import { errorResponse } from "@/lib/parking-admin/errors";

export async function GET(req: Request) {
  try {
    const session = await requireApiSession(req);
    const supabase = createServiceClient();
    const summary = await getDashboardSummary(supabase, session.assignedSiteId);
    return NextResponse.json(summary);
  } catch (err) {
    return errorResponse(err);
  }
}
