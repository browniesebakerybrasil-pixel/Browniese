import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-64" />
      </header>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <article
            key={i}
            className="rounded-lg border border-[var(--border)] bg-white p-5"
          >
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="mt-3 h-8 w-2/3" />
            <Skeleton className="mt-3 h-3 w-3/4" />
          </article>
        ))}
      </section>
      <section className="rounded-lg border border-[var(--border)] bg-white p-5">
        <Skeleton className="h-5 w-48" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b border-[var(--border)] pb-2"
            >
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
