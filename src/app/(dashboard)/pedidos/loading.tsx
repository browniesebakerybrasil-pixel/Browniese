import { Skeleton } from "@/components/ui/skeleton";
import { ORDER_COLUMNS, ORDER_STATUS_COLOR } from "@/components/pedidos/order-constants";

/**
 * Skeleton mostrado enquanto a página de pedidos carrega.
 * Mantém o mesmo layout do Kanban para evitar "salto" no momento da troca.
 */
export default function PedidosLoading() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </header>

      <div className="grid gap-3 rounded-lg border border-[var(--border)] bg-white p-4 md:grid-cols-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-3 md:mx-0 md:px-0">
        <div className="flex min-w-fit gap-3">
          {ORDER_COLUMNS.map((col) => (
            <div
              key={col.status}
              className="flex w-72 shrink-0 flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-white shadow-sm"
            >
              <div
                className="h-1"
                style={{ backgroundColor: ORDER_STATUS_COLOR[col.status] }}
              />
              <header className="border-b border-[var(--border)] px-3 py-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="mt-2 h-3 w-24" />
              </header>
              <div className="flex flex-col gap-2 bg-[var(--color-cream-50)] p-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-md border border-[var(--border)] bg-white p-3"
                  >
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="mt-2 h-4 w-3/4" />
                    <Skeleton className="mt-3 h-3 w-1/2" />
                    <Skeleton className="mt-2 h-3 w-2/3" />
                    <div className="mt-3 flex items-center justify-between">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
