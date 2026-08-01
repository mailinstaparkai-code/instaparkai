"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { hashPassword } from "@/lib/valet-auth/password";
import { getCurrentSiteId, getValetSession } from "@/lib/valet-auth/session";
import { uploadOperatorPhoto, uploadOperatorDocument } from "@/lib/valet-photos";
import { todayIST } from "@/lib/operator-availability";

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
  const email = formData.get("email")?.toString().trim() || null;
  const phone = formData.get("phone")?.toString().trim() || null;
  const driving_license_expiry = formData.get("driving_license_expiry")?.toString().trim() || null;
  if (!username || !password) return;

  const session = await assertParkingAdmin();
  const supabase = createServiceClient();

  const { data: created, error } = await supabase
    .from("valet_accounts")
    .insert({
      username,
      password_hash: hashPassword(password),
      role: "valet_operator",
      assigned_site_id: getCurrentSiteId(session),
      full_name,
      employee_id,
      email,
      phone,
      driving_license_expiry,
      created_by: session.accountId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // Uploaded in parallel (4 photo/document fields) rather than one-at-a-time --
  // same rationale as uploadTicketPhotos: each is a separate round trip to Storage.
  const [photo_path, driving_license_path, aadhar_path, police_verification_path] = await Promise.all([
    uploadOperatorPhoto(supabase, getCurrentSiteId(session), created.id, formData),
    uploadOperatorDocument(supabase, getCurrentSiteId(session), created.id, formData, "driving_license", "dl"),
    uploadOperatorDocument(supabase, getCurrentSiteId(session), created.id, formData, "aadhar", "aadhar"),
    uploadOperatorDocument(supabase, getCurrentSiteId(session), created.id, formData, "police_verification", "police"),
  ]);

  const uploads: Record<string, unknown> = {};
  if (photo_path) uploads.photo_path = photo_path;
  if (driving_license_path) uploads.driving_license_path = driving_license_path;
  if (aadhar_path) uploads.aadhar_path = aadhar_path;
  if (police_verification_path) uploads.police_verification_path = police_verification_path;
  if (Object.keys(uploads).length) {
    await supabase.from("valet_accounts").update(uploads).eq("id", created.id);
  }

  revalidatePath(PATH);
}

export async function updateOperator(formData: FormData) {
  const id = formData.get("id")?.toString();
  const username = formData.get("username")?.toString().trim();
  const password = formData.get("password")?.toString();
  const full_name = formData.get("full_name")?.toString().trim() || null;
  const employee_id = formData.get("employee_id")?.toString().trim() || null;
  const email = formData.get("email")?.toString().trim() || null;
  const phone = formData.get("phone")?.toString().trim() || null;
  const driving_license_expiry = formData.get("driving_license_expiry")?.toString().trim() || null;
  if (!id || !username) return;

  const session = await assertParkingAdmin();
  const supabase = createServiceClient();

  const update: Record<string, unknown> = {
    username,
    full_name,
    employee_id,
    email,
    phone,
    driving_license_expiry,
  };
  if (password) {
    update.password_hash = hashPassword(password);
  }

  const [photo_path, driving_license_path, aadhar_path, police_verification_path] = await Promise.all([
    uploadOperatorPhoto(supabase, getCurrentSiteId(session), id, formData),
    uploadOperatorDocument(supabase, getCurrentSiteId(session), id, formData, "driving_license", "dl"),
    uploadOperatorDocument(supabase, getCurrentSiteId(session), id, formData, "aadhar", "aadhar"),
    uploadOperatorDocument(supabase, getCurrentSiteId(session), id, formData, "police_verification", "police"),
  ]);
  if (photo_path) update.photo_path = photo_path;
  if (driving_license_path) update.driving_license_path = driving_license_path;
  if (aadhar_path) update.aadhar_path = aadhar_path;
  if (police_verification_path) update.police_verification_path = police_verification_path;

  const { error } = await supabase
    .from("valet_accounts")
    .update(update)
    .eq("id", id)
    .eq("assigned_site_id", getCurrentSiteId(session))
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
    .eq("assigned_site_id", getCurrentSiteId(session))
    .eq("role", "valet_operator");
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
}

export async function setOperatorDailyStatus(formData: FormData) {
  const operator_id = formData.get("operator_id")?.toString();
  const status = formData.get("status")?.toString();
  if (!operator_id || !status) return;

  const session = await assertParkingAdmin();
  const supabase = createServiceClient();

  const { data: operator } = await supabase
    .from("valet_accounts")
    .select("id")
    .eq("id", operator_id)
    .eq("assigned_site_id", getCurrentSiteId(session))
    .eq("role", "valet_operator")
    .maybeSingle();
  if (!operator) throw new Error("Operator not found.");

  const { error } = await supabase.from("operator_daily_status").upsert(
    {
      operator_id,
      status_date: todayIST(),
      status,
      set_by: session.accountId,
    },
    { onConflict: "operator_id,status_date" }
  );
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
}

const MAX_LEAVE_DAYS = 90;

export async function setOperatorLeave(formData: FormData) {
  const operator_id = formData.get("operator_id")?.toString();
  const start_date = formData.get("start_date")?.toString();
  const end_date = formData.get("end_date")?.toString();
  if (!operator_id || !start_date || !end_date) return;
  if (end_date < start_date) return;

  const session = await assertParkingAdmin();
  const supabase = createServiceClient();

  const { data: operator } = await supabase
    .from("valet_accounts")
    .select("id")
    .eq("id", operator_id)
    .eq("assigned_site_id", getCurrentSiteId(session))
    .eq("role", "valet_operator")
    .maybeSingle();
  if (!operator) throw new Error("Operator not found.");

  const dates: string[] = [];
  const cursor = new Date(`${start_date}T00:00:00Z`);
  const end = new Date(`${end_date}T00:00:00Z`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (dates.length > MAX_LEAVE_DAYS) return;
  }

  const { error } = await supabase.from("operator_daily_status").upsert(
    dates.map((status_date) => ({
      operator_id,
      status_date,
      status: "leave",
      set_by: session.accountId,
    })),
    { onConflict: "operator_id,status_date" }
  );
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
    .eq("assigned_site_id", getCurrentSiteId(session))
    .eq("role", "valet_operator");
  if (error) throw new Error(error.message);

  revalidatePath(PATH);
}
