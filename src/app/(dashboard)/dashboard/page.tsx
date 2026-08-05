import Link from "next/link";
import { requireOrganization } from "@/lib/auth/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { EventItem } from "@/types";

export const metadata = { title: "Visão geral" };

/**
 * Dashboard Executivo.
 *
 * Blocos práticos, sem gráficos. Tudo pra responder em 5 segundos:
 *   "O que preciso fazer hoje e essa semana?".
 *
 *  1. "Hoje" — pedidos em produção, entregas próximas 24h, saldo aberto
 *  2. "Alertas" (só se tiver) — atrasados, margem baixa, matérias sem uso,
 *     estoque baixo
 *  3. "Próximas encomendas" — os próximos pedidos com category=encomenda
 *  4. "Próximo evento" — festival ou feira agendada
 *  5. "Top 3 vendidos (30d)" e "Top 3 maior margem" — insight direto
 */
export default async function DashboardPage() {
  const { organization } = await requireOrganization();
  const supabase = createAdminClient();

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);
  const cutoff30 = new Date(today);
  cutoff30.setDate(today.getDate() - 30);
  const cutoff30Str = cutoff30.toISOString().slice(0, 10);

  const [
    { data: openOrders },
    { data: nextDeliveries },
    { data: nextEncomendas },
    { data: nextEvent },
    { data: sheets },
    { data: recentItems },
    { data: rawMaterials },
  ] = await Promise.all([
    // pedidos abertos com saldo a receber
    supabase
      .from("orders")
      .select(
        "id, total_amount, amount_paid, order_status, payment_status, delivery_date",
      )
      .eq("organization_id", organization.id)
      .in("payment_status", ["nao_pago", "sinal_pago"])
      .not("order_status", "in", "(entregue,cancelado)"),
    // próximas entregas 24h
    supabase
      .from("orders")
      .select(
        "id, order_number, customer_name, delivery_date, delivery_type, total_amount, order_status, category",
      )
      .eq("organization_id", organization.id)
      .gte("delivery_date", todayStr)
      .lte("delivery_date", tomorrowStr)
      .not("order_status", "in", "(entregue,cancelado)")
      .order("delivery_date", { ascending: true })
      .limit(8),
    // próximas encomendas (category=encomenda)
    supabase
      .from("orders")
      .select(
        "id, order_number, customer_name, delivery_date, total_amount, order_status",
      )
      .eq("organization_id", organization.id)
      .eq("category", "encomenda")
      .gte("delivery_date", todayStr)
      .not("order_status", "in", "(entregue,cancelado)")
      .order("delivery_date", { ascending: true })
      .limit(5),
    // próximo evento
    supabase
      .from("events")
      .select("*")
      .eq("organization_id", organization.id)
      .gte("event_date", todayStr)
      .order("event_date", { ascending: true })
      .limit(1),
    // fichas (pra top vendidos / margem)
    supabase
      .from("technical_sheets")
      .select("id, name, sale_price, cost_per_unit"),
    // itens dos últimos 30 dias (pra ranking)
    supabase
      .from("order_items")
      .select(
        "product_name, quantity, total_price, technical_sheet_id, order:orders!inner(order_date, organization_id, order_status)",
      )
      .eq("order.organization_id", organization.id)
      .gte("order.order_date", cutoff30Str)
      .not("order.order_status", "eq", "cancelado"),
    // matérias com estoque (pra alertas)
    supabase
      .from("raw_materials")
      .select("id, name, current_stock, low_stock_threshold, unit")
      .eq("organization_id", organization.id)
      .not("current_stock", "is", null)
      .not("low_stock_threshold", "is", null),
  ]);

  const openOrdersList = (openOrders ?? []) as Array<{
    id: string;
    total_amount: number;
    amount_paid: number;
    order_status: string;
    delivery_date: string | null;
  }>;

  const receivable = openOrdersList.reduce(
    (acc, o) =>
      acc + Math.max(0, Number(o.total_amount ?? 0) - Number(o.amount_paid ?? 0)),
    0,
  );

  const inProductionStatuses = new Set(["novo", "confirmado", "em_producao"]);
  const pendingProduction = openOrdersList.filter((o) =>
    inProductionStatuses.has(String(o.order_status)),
  ).length;

  const overdue = openOrdersList.filter(
    (o) => o.delivery_date && o.delivery_date < todayStr,
  );

  // ----- Ranking de vendas ---------------------------------------------------
  type Item = {
    product_name: string;
    quantity: number;
    total_price: number;
    technical_sheet_id: string | null;
  };
  const items = (recentItems ?? []) as unknown as Item[];
  const byProduct = new Map<
    string,
    { name: string; qty: number; gross: number }
  >();
  for (const it of items) {
    const key = it.technical_sheet_id ?? `avulso:${it.product_name}`;
    const cur = byProduct.get(key);
    const qty = Number(it.quantity) || 0;
    const gross = Number(it.total_price) || 0;
    if (cur) {
      cur.qty += qty;
      cur.gross += gross;
    } else {
      byProduct.set(key, { name: it.product_name, qty, gross });
    }
  }
  const topSold = Array.from(byProduct.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 3);

  // ----- Top margem ----------------------------------------------------------
  type Sheet = {
    id: string;
    name: string;
    sale_price: number;
    cost_per_unit: number;
  };
  const sheetList = (sheets ?? []) as Sheet[];
  const topMargin = sheetList
    .map((s) => {
      const price = Number(s.sale_price);
      const cost = Number(s.cost_per_unit);
      const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
      return { ...s, margin };
    })
    .filter((s) => s.sale_price > 0)
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 3);

  const lowMarginCount = sheetList.filter((s) => {
    const price = Number(s.sale_price);
    const cost = Number(s.cost_per_unit);
    if (price <= 0) return false;
    return ((price - cost) / price) * 100 < 30;
  }).length;

  // ----- Estoque baixo -------------------------------------------------------
  type RM = {
    id: string;
    name: string;
    current_stock: number | null;
    low_stock_threshold: number | null;
    unit: string;
  };
  const lowStock = ((rawMaterials ?? []) as RM[]).filter(
    (m) =>
      m.current_stock != null &&
      m.low_stock_threshold != null &&
      Number(m.current_stock) <= Number(m.low_stock_threshold),
  );

  // ----- Alertas consolidados ------------------------------------------------
  const alerts: Array<{ label: string; href: string; tone: "warn" | "danger" }> = [];
  if (overdue.length > 0) {
    alerts.push({
      label: `${overdue.length} pedido(s) com entrega atrasada`,
      href: "/pedidos",
      tone: "danger",
    });
  }
  if (lowStock.length > 0) {
    alerts.push({
      label: `${lowStock.length} matéria(s) com estoque baixo`,
      href: "/materias-primas",
      tone: "warn",
    });
  }
  if (lowMarginCount > 0) {
    alerts.push({
      label: `${lowMarginCount} ficha(s) com margem abaixo de 30%`,
      href: organization.plan === "basico" ? "/fichas-tecnicas" : "/inteligencia",
      tone: "warn",
    });
  }

  const upcomingEvent = ((nextEvent ?? []) as EventItem[])[0] ?? null;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-[var(--color-slate)]">Visão geral</p>
        <h2 className="font-serif text-3xl text-[var(--color-navy)]">
          {organization.name}
        </h2>
      </header>

      {/* Hoje */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Kpi
          label="Pedidos a produzir"
          value={String(pendingProduction)}
          hint="novo + confirmado + em produção"
          tone={pendingProduction > 0 ? "warn" : "default"}
        />
        <Kpi
          label="Entregas próximas 24h"
          value={String((nextDeliveries ?? []).length)}
          hint="hoje e amanhã"
        />
        <Kpi
          label="A receber"
          value={formatCurrency(receivable)}
          hint="saldos em aberto"
          tone={receivable > 0 ? "warn" : "default"}
        />
      </section>

      {/* Alertas */}
      {alerts.length > 0 ? (
        <section className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <h3 className="font-serif text-lg text-amber-900">Alertas</h3>
          <ul className="mt-2 space-y-1.5">
            {alerts.map((a) => (
              <li key={a.label} className="text-sm">
                <Link
                  href={a.href}
                  className={
                    a.tone === "danger"
                      ? "text-red-800 hover:underline"
                      : "text-amber-900 hover:underline"
                  }
                >
                  • {a.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Próximas entregas 24h */}
        <section className="rounded-lg border border-[var(--border)] bg-white p-5">
          <header className="flex items-center justify-between gap-2">
            <h3 className="font-serif text-lg text-[var(--color-navy)]">
              Entregas próximas 24h
            </h3>
            <Link
              href="/pedidos"
              className="text-sm text-[var(--color-brown)] hover:underline"
            >
              Ver Kanban
            </Link>
          </header>
          {(nextDeliveries ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-[var(--color-slate)]">
              Nada agendado pra hoje ou amanhã.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--border)]">
              {(
                (nextDeliveries ?? []) as unknown as Array<{
                  id: string;
                  order_number: number;
                  customer_name: string | null;
                  delivery_date: string;
                  delivery_type: string;
                  total_amount: number;
                  category: string;
                }>
              ).map((o) => (
                <li key={o.id} className="py-2 text-sm">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-xs text-[var(--color-slate)]">
                      #{String(o.order_number).padStart(3, "0")} · {o.delivery_date} · {o.delivery_type}
                    </span>
                    <span className="font-medium text-[var(--color-navy)]">
                      {formatCurrency(Number(o.total_amount))}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[var(--color-navy)]">
                    {o.customer_name ?? "Sem cliente"}
                    {o.category && o.category !== "comum" ? (
                      <span className="ml-2 text-xs uppercase tracking-wider text-purple-700">
                        · {o.category}
                      </span>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Próximas encomendas */}
        <section className="rounded-lg border border-[var(--border)] bg-white p-5">
          <header className="flex items-center justify-between gap-2">
            <h3 className="font-serif text-lg text-[var(--color-navy)]">
              Próximas encomendas
            </h3>
            <Link
              href="/pedidos"
              className="text-sm text-[var(--color-brown)] hover:underline"
            >
              Ver todas
            </Link>
          </header>
          {(nextEncomendas ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-[var(--color-slate)]">
              Nenhuma encomenda em aberto.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--border)]">
              {(
                (nextEncomendas ?? []) as unknown as Array<{
                  id: string;
                  order_number: number;
                  customer_name: string | null;
                  delivery_date: string | null;
                  total_amount: number;
                }>
              ).map((o) => (
                <li key={o.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-[var(--color-slate)]">
                      #{String(o.order_number).padStart(3, "0")} · {o.delivery_date ?? "sem data"}
                    </p>
                    <p className="mt-0.5 text-[var(--color-navy)]">
                      {o.customer_name ?? "Sem cliente"}
                    </p>
                  </div>
                  <span className="font-medium text-[var(--color-navy)]">
                    {formatCurrency(Number(o.total_amount))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Top vendidos */}
        <section className="rounded-lg border border-[var(--border)] bg-white p-5">
          <header className="flex items-center justify-between gap-2">
            <h3 className="font-serif text-lg text-[var(--color-navy)]">
              Top 3 vendidos (30d)
            </h3>
            {organization.plan !== "basico" ? (
              <Link
                href="/inteligencia"
                className="text-sm text-[var(--color-brown)] hover:underline"
              >
                Inteligência
              </Link>
            ) : null}
          </header>
          {topSold.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--color-slate)]">
              Sem vendas nos últimos 30 dias.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--border)]">
              {topSold.map((p) => (
                <li key={p.name} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-[var(--color-navy)]">{p.name}</span>
                  <span className="font-mono text-[var(--color-slate)]">
                    {p.qty} un
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Top margem */}
        <section className="rounded-lg border border-[var(--border)] bg-white p-5">
          <header>
            <h3 className="font-serif text-lg text-[var(--color-navy)]">
              Top 3 maior margem
            </h3>
          </header>
          {topMargin.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--color-slate)]">
              Cadastre preço nas fichas pra ver o ranking.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--border)]">
              {topMargin.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-[var(--color-navy)]">{s.name}</span>
                  <span className="font-mono text-emerald-800">
                    {formatPercent(s.margin, 1)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Próximo evento */}
      <section className="rounded-lg border border-[var(--border)] bg-white p-5">
        <header className="flex items-center justify-between gap-2">
          <h3 className="font-serif text-lg text-[var(--color-navy)]">
            Próximo evento
          </h3>
          <Link
            href="/eventos"
            className="text-sm text-[var(--color-brown)] hover:underline"
          >
            Ver todos
          </Link>
        </header>
        {upcomingEvent ? (
          <div className="mt-3 rounded-md bg-purple-50 p-4">
            <p className="font-serif text-xl text-purple-900">
              {upcomingEvent.name}
            </p>
            <p className="mt-1 text-sm text-purple-800">
              {formatEventDate(upcomingEvent.event_date)}
            </p>
            {upcomingEvent.notes ? (
              <p className="mt-2 text-sm text-purple-900/80">
                {upcomingEvent.notes}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--color-slate)]">
            Nenhum evento agendado.{" "}
            <Link
              href="/eventos"
              className="text-[var(--color-brown)] hover:underline"
            >
              Cadastrar
            </Link>
            .
          </p>
        )}
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warn" | "good" | "danger";
}) {
  const border =
    tone === "warn"
      ? "border-amber-200"
      : tone === "good"
        ? "border-emerald-200"
        : tone === "danger"
          ? "border-red-200"
          : "border-[var(--border)]";
  const color =
    tone === "warn"
      ? "text-amber-800"
      : tone === "good"
        ? "text-emerald-800"
        : tone === "danger"
          ? "text-red-800"
          : "text-[var(--color-navy)]";
  return (
    <article className={`rounded-lg border bg-white p-5 ${border}`}>
      <p className="text-xs uppercase tracking-widest text-[var(--color-slate)]">
        {label}
      </p>
      <p className={`mt-2 font-serif text-3xl ${color}`}>{value}</p>
      {hint ? (
        <p className="mt-2 text-xs text-[var(--color-slate)]">{hint}</p>
      ) : null}
    </article>
  );
}

function formatEventDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
