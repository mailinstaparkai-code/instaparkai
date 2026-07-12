"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { hashPassword } from "@/lib/valet-auth/password";
import { getValetSession } from "@/lib/valet-auth/session";

const PATH = "/parking-admin/operators";

async function assertParkingAdmin() {
  const session = await getValetSession();
  if (!session || session.role !== "parking_admin") {
    throw new Error("Parking Admin access required.");
  }
  return session;
}

export async function createOperator(formData: FormData) {
  const username = formData.get("username")?.toString().trim();
  const password = formData.get("password")?.toString();
  const full_name = formData.get("full_name")?.toString().trim() || null;
  const employee_id = formData.get("employee_id")?.toString().trim() || null;
  if (!username || !password) return;

  const session = await assertParkingAdmin();

  const supabase = createServiceClient();
  const { error } = await supabase.from("valet_accounts").insert({
    username,
    password_hash: hashPassword(password),
    role: "valet_operator",
    assigned_site_id: session.assignedSiteId,
    full_name,
    employee_id,
    created_by: session.accountId,
  });
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
}

export async function updateOperator(formData: FormData) {
  const id = formData.get("id")?.toString();
  const username = formData.get("username")?.toString().trim();
  const password = formData.get("password")?.toString();
  const full_name = formData.get("full_name")?.toString().trim() || null;
  const employee_id = formData.get("employee_id")?.toString().trim() || null;
  if (!id || !username) return;

  const session = await assertParkingAdmin();

  const update: Record<string, unknown> = { username, full_name, employee_id };
  if (password) {
    update.password_hash = hashPassword(password);
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("valet_accounts")
    .update(update)
    .eq("id", id)
    .eq("assigned_site_id", session.assignedSiteId)
    .eq("role", "valet_operator");
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
}

export async function setOperatorActive(formData: FormData) {
  const id = formData.get("id")?.toString();
  const is_active = formData.get("is_active")?.toString() === "true";
  if (!id) return;

  const session = await assertParkingAdmin();

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("valet_accounts")
    .update({ is_active })
    .eq("id", id)
    .eq("assigned_site_id", session.assignedSiteId)
    .eq("role", "valet_operator");
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
}

export async function deleteOperator(formData: FormData) {
  const id = formData.get("id")?.toString();
  if (!id) return;

  const session = await assertParkingAdmin();

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("valet_accounts")
    .delete()
    .eq("id", id)
    .eq("assigned_site_id", session.assignedSiteId)
    .eq("role", "valet_operator");
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
}
