"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { getValetSession } from "@/lib/valet-auth/session";
import { setMyDailyStatus } from "@/lib/parking-admin/operator-status";

export async function setMyStatus(formData: FormData) {
  const status = formData.get("status")?.toString();
  if (!status) return;

  const session = await getValetSession();
  if (!session) return;

  const supabase = createServiceClient();
  await setMyDailyStatus(supabase, session, status);

  revalidatePath("/parking-admin/m/dashboard");
}
