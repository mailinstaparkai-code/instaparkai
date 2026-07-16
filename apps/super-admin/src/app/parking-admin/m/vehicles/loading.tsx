import { Skeleton } from "@/components/ui/skeleton";

export default function MobileVehiclesLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Skeleton className="h-6 w-28" />
        <Skeleton className="mt-2 h-4 w-24" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-4">
          <Skeleton className="h-7 w-12" />
          <Skeleton className="mt-2 h-3 w-20" />
        </div>
        <div className="glass-card p-4">
          <Skeleton className="h-7 w-12" />
          <Skeleton className="mt-2 h-3 w-20" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-card flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}
