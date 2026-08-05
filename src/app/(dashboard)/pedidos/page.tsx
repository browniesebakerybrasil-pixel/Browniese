import Link from "next/link";
import { requireOrganization } from "@/lib/auth/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { OrderKanban } from "@/components/pedidos/order-kanban";
import type { KanbanOrder } from "@/components/pedidos/types";
import type { SalesChannel } from "@/types";

export const metadata = { title: "Pedidos" };

export default async function OrdersPage() {
  const { organization } = await requireOrganization();
  const supabase = createAdminClient();

  // Janela: ultimos 60 dias + futuros (cobre entregas agendadas)
  const since = new Date();
  since.setDate(since.getDate() - 60);
  const sinceStr = since.toISOString().slice(0, 10);

  const [{ data: channels }, { data: orders }] = await Promise.all([
    supabase
      .from("sales_channels")
      .select("*")
      .eq("organization_id", organization.id)
      .order("name"),
    supabase
      .from("orders")
      .select(
        "id, order_number, order_date, order_time, delivery_date, delivery_type, delivery_address, order_status, payment_status, payment_method, total_amount, net_amount, amount_paid, notes, customer_id, customer_name, channel:sales_channels(id, name, fee_percentage), customer:customers(id, name, whatsapp, address), items:order_items(id, product_name, quantity, unit_price, total_price)",
      )
      .eq("organization_id", organization.id)
      .gte("order_date", sinceStr)
      .order("order_time", { ascending: false }),
  ]);

  const channelList = (channels ?? []) as SalesChannel[];
  const kanbanOrders = (orders ?? []) as unknown as KanbanOrder[];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-serif text-2xl text-[var(--color-navy)] sm:text-3xl">
            Pedidos
          </h2>
          <p className="mt-1 text-sm text-[var(--color-slate)]">
            Kanban completo. Arraste o card entre colunas para mudar o status,
            ou toque para abrir os detalhes.
          </p>
        </div>
        <Link
          href="/pedidos/novo"
          className="w-full sm:w-auto"
          aria-label="Novo pedido"
        >
          <Button
            variant="primary"
            size="lg"
            className="w-full whitespace-nowrap sm:w-auto"
          >
            + Novo pedido
          </Button>
        </Link>
      </header>

      <OrderKanban orders={kanbanOrders} channels={channelList} />
    </div>
  );
}
