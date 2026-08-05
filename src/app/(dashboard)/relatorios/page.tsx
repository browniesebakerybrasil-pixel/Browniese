import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrganization } from "@/lib/auth/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, TD, TH, THead, TR } from "@/components/ui/table";
import { formatCurrency, formatPercent } from "@/lib/utils";

export const metadata = { title: "Relatórios" };

interface Props {
  searchParams: Promise<{ date?: string }>;
}

export default async function ReportsPage({ searchParams }: Props) {
  const { organization } = await requireOrganization();

  // Plano Basico nao tem relatorios — manda para upgrade
  if (organization.plan === "basico") {
    redirect("/configuracoes?upgrade=relatorios");
  }

  const params = await searchParams;
  const date = params.date ?? new Date().toISOString().slice(0, 10);

  const supabase = createAdminClient();
  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, order_date, total_amount, net_amount, channel:sales_channels(id, name, fee_percentage), items:order_items(product_name, quantity, total_price)",
    )
    .eq("organization_id", organization.id)
    .eq("order_date", date)
    .order("order_time", { ascending: false });

  type Row = {
    id: string;
    total_amount: number;
    net_amount: number;
    channel: { id: string; name: string; fee_percentage: number } | null;
    items: Array<{ product_name: string; quantity: number; total_price: number }>;
  };
  const rows = (orders ?? []) as unknown as Row[];

  const totals = rows.reduce(
    (acc, o) => {
      acc.gross += Number(o.total_amount);
      acc.net += Number(o.net_amount);
      acc.count += 1;
      return acc;
    },
    { gross: 0, net: 0, count: 0 },
  );

  // Por canal
  type ByChannel = { name: string; gross: number; net: number; orders: number };
  const byChannel = new Map<string, ByChannel>();
  for (const o of rows) {
    const key = o.channel?.id ?? "_sem_canal";
    const name = o.channel?.name ?? "Sem canal";
    const cur = byChannel.get(key) ?? { name, gross: 0, net: 0, orders: 0 };
    cur.gross += Number(o.total_amount);
    cur.net += Number(o.net_amount);
    cur.orders += 1;
    byChannel.set(key, cur);
  }

  // Top produtos
  type TopProd = { name: string; qty: number; revenue: number };
  const productMap = new Map<string, TopProd>();
  for (const o of rows) {
    for (const it of o.items) {
      const cur = productMap.get(it.product_name) ?? {
        name: it.product_name,
        qty: 0,
        revenue: 0,
      };
      cur.qty += Number(it.quantity);
      cur.revenue += Number(it.total_price);
      productMap.set(it.product_name, cur);
    }
  }
  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return (
    <div className="space-y-8">
      <CardHeader
        title="Relatório diário"
        description="Visão consolidada do dia: receita bruta, taxas, líquido por canal e top produtos."
        action={
          <form className="flex items-end gap-2">
            <input
              type="date"
              name="date"
              defaultValue={date}
              className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
            />
            <Button type="submit" variant="secondary" size="sm">
              Atualizar
            </Button>
            <Link
              href={`/api/relatorios/diario.csv?date=${date}`}
              className="text-sm text-[var(--color-brown)] hover:underline"
            >
              Exportar CSV
            </Link>
          </form>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Pedidos no dia" value={String(totals.count)} />
        <KpiCard label="Bruto" value={formatCurrency(totals.gross)} />
        <KpiCard
          label="Líquido"
          value={formatCurrency(totals.net)}
          hint={
            totals.gross > 0
              ? `taxa média ${formatPercent(((totals.gross - totals.net) / totals.gross) * 100)}`
              : undefined
          }
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="font-serif text-lg text-[var(--color-navy)]">
            Por canal
          </h3>
          <div className="mt-3">
            {byChannel.size === 0 ? (
              <EmptyState title="Sem dados para a data selecionada." />
            ) : (
              <DataTable>
                <THead>
                  <TR>
                    <TH>Canal</TH>
                    <TH>Pedidos</TH>
                    <TH>Bruto</TH>
                    <TH>Líquido</TH>
                  </TR>
                </THead>
                <tbody>
                  {Array.from(byChannel.values()).map((c) => (
                    <TR key={c.name}>
                      <TD className="font-medium">{c.name}</TD>
                      <TD>{c.orders}</TD>
                      <TD>{formatCurrency(c.gross)}</TD>
                      <TD className="font-medium text-[var(--color-navy)]">
                        {formatCurrency(c.net)}
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </DataTable>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="font-serif text-lg text-[var(--color-navy)]">
            Top 10 produtos
          </h3>
          <div className="mt-3">
            {topProducts.length === 0 ? (
              <EmptyState title="Sem dados para a data selecionada." />
            ) : (
              <DataTable>
                <THead>
                  <TR>
                    <TH>Produto</TH>
                    <TH>Qtd</TH>
                    <TH>Receita</TH>
                  </TR>
                </THead>
                <tbody>
                  {topProducts.map((p) => (
                    <TR key={p.name}>
                      <TD>{p.name}</TD>
                      <TD>{p.qty}</TD>
                      <TD>{formatCurrency(p.revenue)}</TD>
                    </TR>
                  ))}
                </tbody>
              </DataTable>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-white p-5">
      <p className="text-xs uppercase tracking-widest text-[var(--color-slate)]">
        {label}
      </p>
      <p className="mt-2 font-serif text-3xl text-[var(--color-navy)]">
        {value}
      </p>
      {hint ? (
        <p className="mt-2 text-xs text-[var(--color-slate)]">{hint}</p>
      ) : null}
    </article>
  );
}
