import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrganization } from "@/lib/auth/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, TD, TH, THead, TR } from "@/components/ui/table";
import { CustomerForm } from "@/components/clientes/customer-form";
import { DeleteCustomerButton } from "@/components/clientes/delete-customer-button";
import { LoyaltyProgress } from "@/components/clientes/loyalty-progress";
import { LoyaltyGiftActions } from "@/components/clientes/loyalty-gift-actions";
import { BumpOrderCountButton } from "@/components/clientes/bump-order-count-button";
import { formatCurrency } from "@/lib/utils";
import type { Customer, Order } from "@/types";

export const metadata = { title: "Cliente" };

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organization } = await requireOrganization();
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!data) notFound();
  const customer = data as Customer;

  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, order_number, order_date, delivery_date, total_amount, order_status, payment_status",
    )
    .eq("organization_id", organization.id)
    .eq("customer_id", id)
    .order("order_date", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <CardHeader
        title={customer.name}
        description={customer.whatsapp ?? "Sem WhatsApp cadastrado"}
        action={
          <Link
            href="/clientes"
            className="text-sm text-[var(--color-slate)] hover:underline"
          >
            Voltar
          </Link>
        }
      />

      {customer.order_count >= 10 && !customer.loyalty_gift_given ? (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 shadow-sm">
          <p className="font-serif text-lg">Cliente merece um mimo! 🎉</p>
          <p className="mt-1">
            {customer.name} já fez {customer.order_count} pedidos. Registre o
            mimo entregue na seção de Fidelidade ao lado.
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <h3 className="font-serif text-lg text-[var(--color-navy)]">
              Dados cadastrais
            </h3>
            <div className="mt-4">
              <CustomerForm mode="edit" customer={customer} />
            </div>
            <div className="mt-6 border-t border-[var(--border)] pt-4">
              <DeleteCustomerButton id={customer.id} name={customer.name} />
            </div>
          </Card>

          <Card>
            <h3 className="font-serif text-lg text-[var(--color-navy)]">
              Histórico de pedidos
            </h3>
            <div className="mt-4">
              {(orders ?? []).length === 0 ? (
                <p className="text-sm text-[var(--color-slate)]">
                  Nenhum pedido ainda.
                </p>
              ) : (
                <DataTable>
                  <THead>
                    <TR>
                      <TH>Nº</TH>
                      <TH>Data</TH>
                      <TH>Entrega</TH>
                      <TH>Status</TH>
                      <TH>Pagamento</TH>
                      <TH>Total</TH>
                    </TR>
                  </THead>
                  <tbody>
                    {((orders ?? []) as unknown as Order[]).map((o) => (
                      <TR key={o.id}>
                        <TD className="font-mono text-xs">
                          #{String(o.order_number).padStart(3, "0")}
                        </TD>
                        <TD>{o.order_date}</TD>
                        <TD>{o.delivery_date ?? "—"}</TD>
                        <TD>{ORDER_STATUS_LABEL[o.order_status]}</TD>
                        <TD>{PAYMENT_LABEL[o.payment_status]}</TD>
                        <TD>{formatCurrency(Number(o.total_amount))}</TD>
                      </TR>
                    ))}
                  </tbody>
                </DataTable>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h3 className="font-serif text-lg text-[var(--color-navy)]">
              Fidelidade
            </h3>
            <div className="mt-4">
              <LoyaltyProgress
                count={customer.order_count}
                giftGiven={customer.loyalty_gift_given}
              />
            </div>
            {customer.loyalty_gift_date ? (
              <p className="mt-3 text-xs text-[var(--color-slate)]">
                Último mimo: {customer.loyalty_gift_date}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <LoyaltyGiftActions
                customerId={customer.id}
                giftGiven={customer.loyalty_gift_given}
                orderCount={customer.order_count}
              />
              <BumpOrderCountButton customerId={customer.id} />
            </div>
            <p className="mt-2 text-xs text-[var(--color-slate)]">
              Use o botão &quot;+1 pedido&quot; se registrou uma compra fora
              do módulo de Pedidos.
            </p>
          </Card>

          <Card>
            <h3 className="font-serif text-lg text-[var(--color-navy)]">
              Resumo
            </h3>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Pedidos" value={String(customer.order_count)} />
              <Row label="Aniversário" value={customer.birthday ?? "—"} />
              <Row label="Endereço" value={customer.address ?? "—"} />
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-[var(--color-slate)]">{label}</dt>
      <dd className="text-right text-[var(--color-navy)]">{value}</dd>
    </div>
  );
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  novo: "Novo",
  confirmado: "Confirmado",
  em_producao: "Em produção",
  pronto: "Pronto",
  saiu: "Saiu",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const PAYMENT_LABEL: Record<string, string> = {
  nao_pago: "Não pago",
  sinal_pago: "Sinal pago",
  pago: "Pago",
};
