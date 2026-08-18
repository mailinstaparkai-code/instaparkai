import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getLatestRelease } from "@/lib/parking-admin/app-releases";
import { requireApiSession } from "@/lib/parking-admin/api-auth";
import { errorResponse } from "@/lib/parking-admin/errors";

export async function GET(req: Request) {
  try {
    // Available to both parking_admin and valet_operator -- bug fixes benefit both
    // roles, so this deliberately skips requireApiParkingAdmin.
    await requireApiSession(req);
    const platform = new URL(req.url).searchParams.get("platform") ?? "android";

    const supabase = createServiceClient();
    const latest = await getLatestRelease(supabase, platform);

    return NextResponse.json({
      latestVersionCode: latest?.versionCode ?? null,
      latestVersionName: latest?.versionName ?? null,
      apkUrl: latest?.apkUrl ?? null,
      releaseNotes: latest?.releaseNotes ?? null,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
