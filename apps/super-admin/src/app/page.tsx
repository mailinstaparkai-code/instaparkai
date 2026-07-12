import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-background p-8 text-foreground">
      <div className="glass-card flex w-full max-w-xl flex-col gap-6 p-8">
        <div>
          <h1 className="text-2xl font-semibold">
            Insta<span className="text-brand-orange">Park</span> AI
          </h1>
          <p className="text-sm text-muted-foreground">
            Super Admin portal — design tokens wired from{" "}
            <code>/design.md</code>. Feature build starts next.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button>Open Barrier</Button>
          <Button variant="secondary">Retry OCR</Button>
          <Button variant="outline">Issue Pass</Button>
          <Button variant="destructive">Blacklist</Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <span className="rounded-full bg-status-success/15 px-3 py-1 text-xs font-medium text-status-success">
            Available
          </span>
          <span className="rounded-full bg-status-danger/15 px-3 py-1 text-xs font-medium text-status-danger">
            Occupied
          </span>
          <span className="rounded-full bg-status-warning/15 px-3 py-1 text-xs font-medium text-status-warning">
            Reserved
          </span>
          <span className="rounded-full bg-status-info/15 px-3 py-1 text-xs font-medium text-status-info">
            EV
          </span>
          <span className="rounded-full bg-status-disabled/15 px-3 py-1 text-xs font-medium text-status-disabled">
            Disabled
          </span>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-brand-orange-soft to-brand-orange-strong p-5 text-white">
          <p className="text-xs opacity-90">Revenue Today</p>
          <p className="font-numeric text-3xl">₹1,28,540</p>
        </div>
      </div>
    </div>
  );
}
