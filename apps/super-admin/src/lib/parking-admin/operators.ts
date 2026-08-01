import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { hashPassword } from "@/lib/valet-auth/password";
import { uploadOperatorPhoto, uploadOperatorDocument } from "@/lib/valet-photos";
import { AppError } from "./errors";

// Shared insert/update/scoping logic with the web Operators page's Server
// Actions (app/parking-admin/(authenticated)/operators/actions.ts) --
// these functions back the new v1/operators/* routes.

function todayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export type OperatorFields = {
  username: string;
  password?: string;
  full_name: string | null;
  employee_id: string | null;
  email: string | null;
  phone: string | null;
  driving_license_expiry: string | null;
};

export async function listOperators(supabase: ReturnType<typeof createServiceClient>, siteId: string) {
  const [{ data: operators }, { data: dailyStatusRows }] = await Promise.all([
    supabase
      .from("valet_accounts")
      .select(
        "id, username, full_name, employee_id, email, phone, is_active, driving_license_expiry"
      )
      .eq("role", "valet_operator")
      .eq("assigned_site_id", siteId)
      .order("created_at", { ascending: false }),
    supabase.from("operator_daily_status").select("operator_id, status").eq("status_date", todayIST()),
  ]);

  const dailyStatusById = new Map((dailyStatusRows ?? []).map((r) => [r.operator_id, r.status as string]));
  return (operators ?? []).map((op) => ({
    ...op,
    dailyStatus: dailyStatusById.get(op.id) ?? null,
  }));
}

export async function createOperator(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string,
  createdBy: string,
  fields: OperatorFields,
  formData: FormData
) {
  if (!fields.password) throw new AppError("invalid_request", "Password is required.", 400);

  const { data: created, error } = await supabase
    .from("valet_accounts")
    .insert({
      username: fields.username,
      password_hash: hashPassword(fields.password),
      role: "valet_operator",
      assigned_site_id: siteId,
      full_name: fields.full_name,
      employee_id: fields.employee_id,
      email: fields.email,
      phone: fields.phone,
      driving_license_expiry: fields.driving_license_expiry,
      created_by: createdBy,
    })
    .select("id")
    .single();
  if (error) throw new AppError("insert_failed", error.message, 400);

  await uploadOperatorAttachments(supabase, siteId, created.id, formData);
  return created.id as string;
}

export async function updateOperator(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string,
  id: string,
  fields: OperatorFields,
  formData: FormData
) {
  const update: Record<string, unknown> = {
    username: fields.username,
    full_name: fields.full_name,
    employee_id: fields.employee_id,
    email: fields.email,
    phone: fields.phone,
    driving_license_expiry: fields.driving_license_expiry,
  };
  if (fields.password) update.password_hash = hashPassword(fields.password);

  await uploadOperatorAttachments(supabase, siteId, id, formData, update);

  const { error } = await supabase
    .from("valet_accounts")
    .update(update)
    .eq("id", id)
    .eq("assigned_site_id", siteId)
    .eq("role", "valet_operator");
  if (error) throw new AppError("update_failed", error.message, 400);
}

async function uploadOperatorAttachments(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string,
  operatorId: string,
  formData: FormData,
  mergeInto?: Record<string, unknown>
) {
  const [photo_path, driving_license_path, aadhar_path, police_verification_path] = await Promise.all([
    uploadOperatorPhoto(supabase, siteId, operatorId, formData),
    uploadOperatorDocument(supabase, siteId, operatorId, formData, "driving_license", "dl"),
    uploadOperatorDocument(supabase, siteId, operatorId, formData, "aadhar", "aadhar"),
    uploadOperatorDocument(supabase, siteId, operatorId, formData, "police_verification", "police"),
  ]);

  const uploads: Record<string, unknown> = {};
  if (photo_path) uploads.photo_path = photo_path;
  if (driving_license_path) uploads.driving_license_path = driving_license_path;
  if (aadhar_path) uploads.aadhar_path = aadhar_path;
  if (police_verification_path) uploads.police_verification_path = police_verification_path;
  if (!Object.keys(uploads).length) return;

  if (mergeInto) {
    Object.assign(mergeInto, uploads);
  } else {
    await supabase.from("valet_accounts").update(uploads).eq("id", operatorId);
  }
}

async function assertOperatorInSite(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string,
  id: string
) {
  const { data } = await supabase
    .from("valet_accounts")
    .select("id")
    .eq("id", id)
    .eq("assigned_site_id", siteId)
    .eq("role", "valet_operator")
    .maybeSingle();
  if (!data) throw new AppError("not_found", "Operator not found.", 404);
}

export async function setOperatorActive(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string,
  id: string,
  isActive: boolean
) {
  await assertOperatorInSite(supabase, siteId, id);
  const { error } = await supabase.from("valet_accounts").update({ is_active: isActive }).eq("id", id);
  if (error) throw new AppError("update_failed", error.message, 400);
}

export async function setOperatorDailyStatus(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string,
  id: string,
  status: string,
  setBy: string
) {
  await assertOperatorInSite(supabase, siteId, id);
  const { error } = await supabase.from("operator_daily_status").upsert(
    { operator_id: id, status_date: todayIST(), status, set_by: setBy },
    { onConflict: "operator_id,status_date" }
  );
  if (error) throw new AppError("update_failed", error.message, 400);
}

const MAX_LEAVE_DAYS = 90;

export async function setOperatorLeave(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string,
  id: string,
  startDate: string,
  endDate: string,
  setBy: string
) {
  if (endDate < startDate) throw new AppError("invalid_request", "End date is before start date.", 400);
  await assertOperatorInSite(supabase, siteId, id);

  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (dates.length > MAX_LEAVE_DAYS) {
      throw new AppError("invalid_request", `Leave range can't exceed ${MAX_LEAVE_DAYS} days.`, 400);
    }
  }

  const { error } = await supabase.from("operator_daily_status").upsert(
    dates.map((status_date) => ({ operator_id: id, status_date, status: "leave", set_by: setBy })),
    { onConflict: "operator_id,status_date" }
  );
  if (error) throw new AppError("update_failed", error.message, 400);
}

export async function deleteOperator(
  supabase: ReturnType<typeof createServiceClient>,
  siteId: string,
  id: string
) {
  const { error } = await supabase
    .from("valet_accounts")
    .delete()
    .eq("id", id)
    .eq("assigned_site_id", siteId)
    .eq("role", "valet_operator");
  if (error) throw new AppError("delete_failed", error.message, 400);
}
