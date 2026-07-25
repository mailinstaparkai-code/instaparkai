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
  // Uploaded in parallel, not one-at-a-time: check-in has 5 photo fields, and the
  // storage bucket is a long round-trip from the serverless region, so a
  // sequential loop made the operator wait for 5 full uploads back-to-back.
  // `map` + filter preserves the original field order in the returned array.
  const results = await Promise.all(
    fields.map(async ({ name, label }) => {
      const file = formData.get(name);
      if (!(file instanceof File) || file.size === 0) return null;

      const buffer = Buffer.from(await file.arrayBuffer());
      const path = `${siteId}/${ticketId}/${stage}-${label}-${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, buffer, { contentType: file.type || "image/jpeg" });
      return error ? null : { label, path };
    })
  );

  return results.filter((r): r is { label: string; path: string } => r !== null);
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
