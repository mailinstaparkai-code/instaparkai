import { redirect } from "next/navigation";
import { UserRound } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { getValetSession } from "@/lib/valet-auth/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createOperator, deleteOperator, setOperatorActive, updateOperator } from "./actions";
import { DeleteButton } from "../../components/delete-button";
import { Field } from "../../components/field";
import { FormDialog } from "../../components/form-dialog";

export default async function ValetOperatorsPage() {
  const session = await getValetSession();
  if (!session) {
    redirect("/parking-admin/login");
  }
  if (session.role !== "parking_admin") {
    redirect("/parking-admin/dashboard");
  }

  const supabase = createServiceClient();
  const { data: operators } = await supabase
    .from("valet_accounts")
    .select("id, username, full_name, employee_id, is_active")
    .eq("role", "valet_operator")
    .eq("assigned_site_id", session.assignedSiteId)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Valet Operators</h1>
          <p className="text-sm text-muted-foreground">
            {operators?.length ?? 0} operator account(s) for your site
          </p>
        </div>
        <FormDialog
          trigger={<Button size="sm">+ New Operator</Button>}
          title="New valet operator"
          action={createOperator}
          submitLabel="Create"
        >
          <Field label="Username">
            <Input name="username" required />
          </Field>
          <Field label="Password">
            <Input name="password" type="password" required />
          </Field>
          <Field label="Full name">
            <Input name="full_name" />
          </Field>
          <Field label="Employee ID">
            <Input name="employee_id" />
          </Field>
        </FormDialog>
      </div>

      <div className="flex flex-col gap-2">
        {operators?.map((op) => (
          <div key={op.id} className="glass-card flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-muted">
                <UserRound className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium">
                  {op.username}
                  {!op.is_active && (
                    <span className="ml-2 rounded-full bg-status-danger/15 px-2 py-0.5 text-xs font-medium text-status-danger">
                      Inactive
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[op.full_name, op.employee_id].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FormDialog
                key={`${op.username}-${op.full_name}-${op.employee_id}`}
                trigger={
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                }
                title="Edit valet operator"
                action={updateOperator}
                submitLabel="Save"
              >
                <input type="hidden" name="id" value={op.id} />
                <Field label="Username">
                  <Input name="username" defaultValue={op.username} required />
                </Field>
                <Field label="New password">
                  <Input name="password" type="password" placeholder="Leave blank to keep current" />
                </Field>
                <Field label="Full name">
                  <Input name="full_name" defaultValue={op.full_name ?? ""} />
                </Field>
                <Field label="Employee ID">
                  <Input name="employee_id" defaultValue={op.employee_id ?? ""} />
                </Field>
              </FormDialog>
              <form action={setOperatorActive}>
                <input type="hidden" name="id" value={op.id} />
                <input type="hidden" name="is_active" value={(!op.is_active).toString()} />
                <Button type="submit" variant="outline" size="sm">
                  {op.is_active ? "Deactivate" : "Activate"}
                </Button>
              </form>
              <DeleteButton title={op.username} action={deleteOperator} hiddenFields={{ id: op.id }} />
            </div>
          </div>
        ))}
        {!operators?.length && (
          <p className="text-sm text-muted-foreground">No valet operators yet.</p>
        )}
      </div>
    </div>
  );
}
