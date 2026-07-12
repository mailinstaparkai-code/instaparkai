"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { verifyPassword } from "@/lib/valet-auth/password";
import { createValetSession } from "@/lib/valet-auth/session";

export async function loginParkingAdmin(
  formData: FormData
): Promise<{ error: string } | { error: null }> {
  const username = formData.get("username")?.toString().trim();
  const password = formData.get("password")?.toString();
  if (!username || !password) {
    return { error: "Enter your username and password." };
  }

  const supabase = createServiceClient();
  const { data: account } = await supabase
    .from("valet_accounts")
    .select("id, password_hash, role, is_active")
    .eq("username", username)
    .maybeSingle();

  if (
    !account ||
    !account.is_active ||
    (account.role !== "parking_admin" && account.role !== "valet_operator") ||
    !verifyPassword(password, account.password_hash)
  ) {
    return { error: "Invalid username or password." };
  }

  await createValetSession(account.id);
  return { error: null };
}
