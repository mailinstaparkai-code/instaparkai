import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { getValetSession } from "@/lib/valet-auth/session";
import { computeFare, type TariffRule } from "@/lib/tariff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "../../components/field";
import { FormDialog } from "../../components/form-dialog";
import {
  checkInVehicle,
  completeHandover,
  dispatchVehicle,
  markArrived,
  requestVehicle,
} from "./actions";
import { HandoverButton } from "./handover-button";

const STATUS_LABEL: Record<string, string> = {
  parked: "Parked",
  requested: "Requested",
  in_transit: "In transit",
  arrived: "Arrived",
  completed: "Completed",
};

const STATUS_COLOR: Record<string, string> = {
  parked: "bg-status-info/15 text-status-info",
  requested: "bg-status-warning/15 text-status-warning",
  in_transit: "bg-brand-orange/15 text-brand-orange",
  arrived: "bg-status-success/15 text-status-success",
  completed: "bg-muted text-muted-foreground",
};

type Ticket = {
  id: string;
  vehicle_number: string;
  vehicle_type: string;
  mobile_number: string;
  status: keyof typeof STATUS_LABEL;
  otp: string | null;
  checked_in_at: string;
  fare_amount: number | null;
  slots: { slot_number: string } | null;
};

export default async function LiveQueuePage() {
  const session = await getValetSession();
  if (!session || session.role !== "parking_admin") {
    redirect("/parking-admin/login");
  }

  const supabase = createServiceClient();

  const [{ data: tickets }, { data: zones }, { data: tariffRules }] = await Promise.all([
    supabase
      .from("valet_tickets")
      .select(
        "id, vehicle_number, vehicle_type, mobile_number, status, otp, checked_in_at, fare_amount, slots(slot_number)"
      )
      .eq("parking_space_id", session.assignedSiteId)
      .neq("status", "completed")
      .order("checked_in_at", { ascending: true })
      .returns<Ticket[]>(),
    supabase
      .from("zones")
      .select("id, name, slots(id, slot_number, status)")
      .eq("parking_space_id", session.assignedSiteId),
    supabase
      .from("tariff_rules")
      .select("vehicle_category, pricing_type, rate, surge_multiplier, slab_tiers")
      .eq("parking_space_id", session.assignedSiteId)
      .returns<TariffRule[]>(),
  ]);

  const availableSlots =
    zones?.flatMap((z) =>
      (z.slots as { id: string; slot_number: string; status: string }[])
        .filter((s) => s.status === "available")
        .map((s) => ({ id: s.id, label: `${z.name} · ${s.slot_number}` }))
    ) ?? [];

  const counts = {
    parked: tickets?.filter((t) => t.status === "parked").length ?? 0,
    requested: tickets?.filter((t) => t.status === "requested").length ?? 0,
    in_transit: tickets?.filter((t) => t.status === "in_transit").length ?? 0,
    arrived: tickets?.filter((t) => t.status === "arrived").length ?? 0,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Live Queue</h1>
          <p className="text-sm text-muted-foreground">{tickets?.length ?? 0} active vehicle(s)</p>
        </div>
        <FormDialog
          trigger={<Button size="sm">+ Check-in Vehicle</Button>}
          title="Check-in vehicle"
          action={checkInVehicle}
          submitLabel="Check in"
        >
          <Field label="Vehicle number">
            <Input name="vehicle_number" required placeholder="MH12AB1234" />
          </Field>
          <Field label="Vehicle type">
            <select
              name="vehicle_type"
              defaultValue="car"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="car">Car</option>
              <option value="bike">Bike</option>
              <option value="suv">SUV</option>
              <option value="xuv">XUV</option>
            </select>
          </Field>
          <Field label="Mobile number">
            <Input name="mobile_number" required placeholder="9876543210" />
          </Field>
          <Field label="Assign slot (optional)">
            <select
              name="slot_id"
              defaultValue=""
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Unassigned</option>
              {availableSlots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
        </FormDialog>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Parked", value: counts.parked },
          { label: "Requested", value: counts.requested },
          { label: "In transit", value: counts.in_transit },
          { label: "Arrived", value: counts.arrived },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-card p-4">
            <p className="font-numeric text-2xl">{kpi.value}</p>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="glass-card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="p-3 font-medium">Vehicle</th>
              <th className="p-3 font-medium">Mobile</th>
              <th className="p-3 font-medium">Slot</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Checked in</th>
              <th className="p-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {tickets?.map((t) => {
              const minutesParked = Math.round(
                (new Date().getTime() - new Date(t.checked_in_at).getTime()) / 60000
              );
              const suggestedFare = computeFare(tariffRules ?? [], t.vehicle_type, minutesParked);

              return (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="p-3">
                    <p className="font-medium">{t.vehicle_number}</p>
                    <p className="text-xs capitalize text-muted-foreground">{t.vehicle_type}</p>
                  </td>
                  <td className="p-3">{t.mobile_number}</td>
                  <td className="p-3">{t.slots?.slot_number ?? "—"}</td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[t.status]}`}
                    >
                      {STATUS_LABEL[t.status]}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(t.checked_in_at).toLocaleTimeString()}
                  </td>
                  <td className="p-3">
                    {t.status === "parked" && (
                      <form action={requestVehicle}>
                        <input type="hidden" name="id" value={t.id} />
                        <Button type="submit" size="sm" variant="outline">
                          Guest requested
                        </Button>
                      </form>
                    )}
                    {t.status === "requested" && (
                      <form action={dispatchVehicle}>
                        <input type="hidden" name="id" value={t.id} />
                        <Button type="submit" size="sm" variant="outline">
                          Dispatch operator
                        </Button>
                      </form>
                    )}
                    {t.status === "in_transit" && (
                      <form action={markArrived}>
                        <input type="hidden" name="id" value={t.id} />
                        <Button type="submit" size="sm" variant="outline">
                          Mark arrived
                        </Button>
                      </form>
                    )}
                    {t.status === "arrived" && (
                      <HandoverButton
                        ticketId={t.id}
                        otp={t.otp}
                        suggestedFare={suggestedFare}
                        action={completeHandover}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
            {!tickets?.length && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                  No active vehicles. Check one in to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
