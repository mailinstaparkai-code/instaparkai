import { notFound } from "next/navigation";
import { CheckCircle2, Circle, KeyRound } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { RequestVehicleButton } from "./request-vehicle-button";
import { StatusPoller } from "./status-poller";

const STEPS = [
  { key: "parked", label: "Parked" },
  { key: "requested", label: "Requested" },
  { key: "in_transit", label: "On the way" },
  { key: "arrived", label: "Arrived" },
] as const;

type Status = "parked" | "requested" | "in_transit" | "arrived" | "completed";

export default async function GuestTrackingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: ticket } = await supabase
    .from("valet_tickets")
    .select(
      "status, otp, vehicle_number, vehicle_type, fare_amount, payment_collected, parking_spaces(name)"
    )
    .eq("ticket_token", token)
    .single<{
      status: Status;
      otp: string | null;
      vehicle_number: string;
      vehicle_type: string;
      fare_amount: number | null;
      payment_collected: boolean;
      parking_spaces: { name: string } | null;
    }>();

  if (!ticket) notFound();

  const stepIndex = STEPS.findIndex((s) => s.key === ticket.status);

  return (
    <div className="pa-scope flex min-h-dvh items-center justify-center bg-background p-6">
      <StatusPoller
        token={token}
        status={ticket.status}
        active={ticket.status !== "completed"}
      />
      <div className="glass-card w-full max-w-sm p-8">
        <h1 className="text-xl font-semibold">
          Insta<span className="text-brand-orange">Park</span> AI
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {ticket.parking_spaces?.name ?? "Valet parking"}
        </p>

        <div className="mt-6 rounded-lg border border-border p-4">
          <p className="text-sm font-medium">{ticket.vehicle_number}</p>
          <p className="text-xs capitalize text-muted-foreground">{ticket.vehicle_type}</p>
        </div>

        {ticket.status === "completed" ? (
          <div className="mt-6 text-center">
            <CheckCircle2 className="mx-auto size-10 text-status-success" />
            <p className="mt-3 font-medium">Vehicle delivered</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Thanks for parking with us!
              {ticket.fare_amount !== null && (
                <>
                  {" "}
                  Fare ₹{ticket.fare_amount} —{" "}
                  {ticket.payment_collected ? "paid" : "payment pending"}.
                </>
              )}
            </p>
          </div>
        ) : (
          <>
            <ol className="mt-6 flex flex-col gap-3">
              {STEPS.map((step, i) => {
                const done = i <= stepIndex;
                return (
                  <li key={step.key} className="flex items-center gap-3 text-sm">
                    {done ? (
                      <CheckCircle2 className="size-5 shrink-0 text-status-success" />
                    ) : (
                      <Circle className="size-5 shrink-0 text-muted-foreground/40" />
                    )}
                    <span className={done ? "font-medium" : "text-muted-foreground"}>
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>

            {ticket.status === "parked" && (
              <div className="mt-6">
                <RequestVehicleButton token={token} />
              </div>
            )}

            {(ticket.status === "requested" || ticket.status === "in_transit") && (
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Your vehicle is on its way. This page updates automatically.
              </p>
            )}

            {ticket.status === "arrived" && ticket.otp && (
              <div className="mt-6 rounded-lg bg-status-success/10 p-4 text-center">
                <KeyRound className="mx-auto size-5 text-status-success" />
                <p className="mt-2 text-xs text-muted-foreground">
                  Show this code to the valet
                </p>
                <p className="mt-1 font-numeric text-3xl font-semibold tracking-widest">
                  {ticket.otp}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
