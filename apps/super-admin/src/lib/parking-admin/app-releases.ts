import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

export type LatestRelease = {
  versionCode: number;
  versionName: string;
  apkUrl: string;
  releaseNotes: string | null;
};

export async function getLatestRelease(
  supabase: ReturnType<typeof createServiceClient>,
  platform: string
): Promise<LatestRelease | null> {
  const { data } = await supabase
    .from("app_releases")
    .select("version_code, version_name, apk_url, release_notes")
    .eq("platform", platform)
    .order("version_code", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    versionCode: data.version_code,
    versionName: data.version_name,
    apkUrl: data.apk_url,
    releaseNotes: data.release_notes,
  };
}
