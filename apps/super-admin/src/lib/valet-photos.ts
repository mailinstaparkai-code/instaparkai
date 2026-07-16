import "server-only";
import type { createServiceClient } from "@/lib/supabase/service";

export const BUCKET = "valet-photos";

export async function uploadTicketPhotos(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string,
  ticketId: string,
  stage: "checkin" | "handover",
  formData: FormData,
  fields: { name: string; label: string }[]
): Promise<{ label: string; path: string }[]> {
  const uploaded: { label: string; path: string }[] = [];

  for (const { name, label } of fields) {
    const file = formData.get(name);
    if (!(file instanceof File) || file.size === 0) continue;

    const buffer = Buffer.from(await file.arrayBuffer());
    const path = `${siteId}/${ticketId}/${stage}-${label}-${Date.now()}.jpg`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type || "image/jpeg" });
    if (!error) uploaded.push({ label, path });
  }

  return uploaded;
}

export async function uploadOperatorPhoto(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string,
  operatorId: string,
  formData: FormData
): Promise<string | null> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return null;

  const buffer = Buffer.from(await file.arrayBuffer());
  const path = `${siteId}/operators/${operatorId}-${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type || "image/jpeg" });

  return error ? null : path;
}
