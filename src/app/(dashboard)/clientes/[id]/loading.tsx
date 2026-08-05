import { Skeleton } from "@/components/ui/skeleton";

export default function ClienteLoading() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
      </header>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="rounded-lg border border-[var(--border)] bg-white p-5">
            <Skeleton className="h-5 w-40" />
            <div className="mt-4 space-y-3">
              <Skeleton className="h-10" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
              <Skeleton className="h-10" />
              <Skeleton className="h-20" />
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-lg border border-[var(--border)] bg-white p-5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-4 h-16" />
            <Skeleton className="mt-4 h-9 w-40" />
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-white p-5">
            <Skeleton className="h-5 w-24" />
            <div className="mt-3 space-y-2">
              <Skeleton className="h-4" />
              <Skeleton className="h-4" />
              <Skeleton className="h-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
