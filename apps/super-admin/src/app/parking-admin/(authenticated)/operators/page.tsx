import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getValetSession } from "@/lib/valet-auth/session";
import { BUCKET } from "@/lib/valet-photos";
import { Button } from "@/components/ui/button";
import {
  createOperator,
  deleteOperator,
  setOperatorActive,
  setOperatorDailyStatus,
  setOperatorLeave,
  updateOperator,
} from "./actions";
import { FormDialog } from "../../components/form-dialog";
import { OperatorFormFields } from "./operator-form-fields";
import { OperatorCard } from "./operator-card";
import { OperatorFilters } from "./operator-filters";

function todayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function parseCsv(value: string | undefined): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

export default async function ValetOperatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ active?: string; daily_status?: string }>;
}) {
  const session = await getValetSession();
  if (!session) {
    redirect("/parking-admin/login");
  }
  if (session.role !== "parking_admin") {
    redirect("/parking-admin/dashboard");
  }

  const params = await searchParams;
  const activeFilter = parseCsv(params.active);
  const dailyStatusFilter = parseCsv(params.daily_status);

  const supabase = createServiceClient();
  const [{ data: allOperators }, { data: dailyStatusRows }] = await Promise.all([
    supabase
      .from("valet_accounts")
      .select(
        "id, username, full_name, employee_id, email, phone, photo_path, is_active, driving_license_path, driving_license_expiry, aadhar_path, police_verification_path"
      )
      .eq("role", "valet_operator")
      .eq("assigned_site_id", session.assignedSiteId)
      .order("created_at", { ascending: false }),
    supabase
      .from("operator_daily_status")
      .select("operator_id, status")
      .eq("status_date", todayIST()),
  ]);

  const dailyStatusById = new Map(
    (dailyStatusRows ?? []).map((row) => [row.operator_id, row.status as string])
  );

  const photoUrlById = new Map(
    (
      await Promise.all(
        (allOperators ?? [])
          .filter((op) => op.photo_path)
          .map(async (op) => {
            const { data } = await supabase.storage
              .from(BUCKET)
              .createSignedUrl(op.photo_path!, 3600);
            return [op.id, data?.signedUrl ?? null] as const;
          })
      )
    ).filter((entry): entry is [string, string] => !!entry[1])
  );

  const DOC_FIELDS = [
    ["driving_license_path", "driving_license"],
    ["aadhar_path", "aadhar"],
    ["police_verification_path", "police_verification"],
  ] as const;

  const docUrlById = new Map(
    (
      await Promise.all(
        (allOperators ?? []).flatMap((op) =>
          DOC_FIELDS.map(async ([column, field]): Promise<[string, string] | null> => {
            const path = op[column];
            if (!path) return null;
            const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
            return data?.signedUrl ? [`${op.id}:${field}`, data.signedUrl] : null;
          })
        )
      )
    ).filter((entry): entry is [string, string] => !!entry)
  );

  const operators = (allOperators ?? []).filter((op) => {
    if (activeFilter.length) {
      const label = op.is_active ? "active" : "inactive";
      if (!activeFilter.includes(label)) return false;
    }
    if (dailyStatusFilter.length) {
      const status = dailyStatusById.get(op.id) ?? "unset";
      if (!dailyStatusFilter.includes(status)) return false;
    }
    return true;
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Valet Operators</h1>
          <p className="text-sm text-muted-foreground">
            {operators.length} operator account(s) for your site
          </p>
        </div>
        <FormDialog
          trigger={<Button size="sm" className="bg-brand-orange hover:bg-brand-orange-strong">+ New Operator</Button>}
          title="New valet operator"
          action={createOperator}
          submitLabel="Create"
        >
          <OperatorFormFields />
        </FormDialog>
      </div>

      <OperatorFilters active={activeFilter} dailyStatus={dailyStatusFilter} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {operators.map((op) => (
          <OperatorCard
            key={op.id}
            operator={op}
            photoUrl={photoUrlById.get(op.id) ?? null}
            documentUrls={{
              driving_license: docUrlById.get(`${op.id}:driving_license`) ?? null,
              aadhar: docUrlById.get(`${op.id}:aadhar`) ?? null,
              police_verification: docUrlById.get(`${op.id}:police_verification`) ?? null,
            }}
            dailyStatus={dailyStatusById.get(op.id) ?? null}
            updateAction={updateOperator}
            leaveAction={setOperatorLeave}
            activeAction={setOperatorActive}
            deleteAction={deleteOperator}
            dailyStatusAction={setOperatorDailyStatus}
          />
        ))}
      </div>
      {!operators.length && (
        <p className="text-sm text-muted-foreground">
          {allOperators?.length ? "No operators match this filter." : "No valet operators yet."}
        </p>
      )}
    </div>
  );
}
