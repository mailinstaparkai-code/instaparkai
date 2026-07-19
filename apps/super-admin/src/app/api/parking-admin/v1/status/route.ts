import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getMyDailyStatus, setMyDailyStatus } from "@/lib/parking-admin/operator-status";
import { requireApiSession } from "@/lib/parking-admin/api-auth";
import { errorResponse } from "@/lib/parking-admin/errors";

export async function GET(req: Request) {
  try {
    const session = await requireApiSession(req);
    const supabase = createServiceClient();
    const result = await getMyDailyStatus(supabase, session);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireApiSession(req);
    const body = await req.json().catch(() => ({}));
    const supabase = createServiceClient();
    const result = await setMyDailyStatus(supabase, session, body.status);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
