import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrganization } from "@/lib/auth/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader } from "@/components/ui/card";
import { OrderForm } from "@/components/pedidos/order-form";
import type { EditableOrder } from "@/components/pedidos/order-form";
import type {
  Customer,
  EventItem,
  SalesChannel,
  TechnicalSheet,
} from "@/types";

export const metadata = { title: "Editar pedido" };

/**
 * Tela de edição completa do pedido. Reaproveita o OrderForm em mode="edit"
 * passando os defaults carregados do banco. Salvar chama updateOrder que
 * refaz linha do pedido + substitui todos os itens.
 */
export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organization } = await requireOrganization();
  const supabase = createAdminClient();

  const todayStr = new Date().toISOString().slice(0, 10);

  const [
    { data: order },
    { data: channels },
    { data: sheets },
    { data: customers },
    { data: events },
    { data: items },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .eq("organization_id", organization.id)
      .maybeSingle(),
    supabase
      .from("sales_channels")
      .select("*")
      .eq("organization_id", organization.id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("technical_sheets")
      .select("id, name, sale_price")
      .eq("organization_id", organization.id)
      .order("name"),
    supabase
      .from("customers")
      .select("*")
      .eq("organization_id", organization.id)
      .order("name"),
    supabase
      .from("events")
      .select("*")
      .eq("organization_id", organization.id)
      .gte("event_date", todayStr)
      .order("event_date", { ascending: true }),
    supabase
      .from("order_items")
      .select("id, technical_sheet_id, product_name, quantity, unit_price")
      .eq("order_id", id),
  ]);

  if (!order) notFound();

  const o = order as Record<string, unknown>;
  const editable: EditableOrder = {
    id: String(o.id),
    customer_id: (o.customer_id as string | null) ?? null,
    customer_name: (o.customer_name as string | null) ?? null,
    sales_channel_id: (o.sales_channel_id as string | null) ?? null,
    order_date: String(o.order_date),
    delivery_date: (o.delivery_date as string | null) ?? null,
    delivery_type: (o.delivery_type as EditableOrder["delivery_type"]) ?? "retirada",
    delivery_address: (o.delivery_address as string | null) ?? null,
    payment_status:
      (o.payment_status as EditableOrder["payment_status"]) ?? "nao_pago",
    payment_method:
      (o.payment_method as EditableOrder["payment_method"]) ?? "pix",
    amount_paid: Number(o.amount_paid ?? 0),
    order_status: String(o.order_status ?? "novo"),
    category: (o.category as EditableOrder["category"]) ?? "comum",
    event_id: (o.event_id as string | null) ?? null,
    notes: (o.notes as string | null) ?? null,
    items: ((items ?? []) as unknown as EditableOrder["items"]).map((it) => ({
      id: it.id,
      technical_sheet_id: it.technical_sheet_id,
      product_name: it.product_name,
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price),
    })),
  };

  return (
    <div className="max-w-4xl space-y-6">
      <CardHeader
        title={`Editar pedido #${String((o.order_number as number) ?? "").padStart(3, "0")}`}
        description="Cliente, itens, pagamento — edita tudo. Ao salvar, os itens antigos são substituídos pelos novos."
        action={
          <Link
            href="/pedidos"
            className="text-sm text-[var(--color-slate)] hover:underline"
          >
            Voltar
          </Link>
        }
      />
      <Card>
        <OrderForm
          mode="edit"
          order={editable}
          channels={(channels ?? []) as SalesChannel[]}
          sheets={
            (sheets ?? []) as Pick<
              TechnicalSheet,
              "id" | "name" | "sale_price"
            >[]
          }
          customers={(customers ?? []) as Customer[]}
          events={(events ?? []) as EventItem[]}
        />
      </Card>
    </div>
  );
}
