import Link from "next/link";
import { requireOrganization } from "@/lib/auth/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Visão geral" };

interface KpiCard {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "warn" | "danger";
}

/**
 * Dashboard inicial.
 * Cards:
 *  - Vendas de hoje (bruto / líquido)
 *  - Total a receber (pedidos não pagos + sinal pago, saldo pendente)
 *  - Total já recebido hoje (amount_paid de pedidos do dia)
 *  - Pedidos pendentes de produção (novo + confirmado + em_producao)
 *  - Próximas entregas (próximas 24h)
 *  - Matérias / fichas (catálogo)
 */
export default async function DashboardPage() {
  const { organization } = await requireOrganization();
  const supabase = createAdminClient();

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const [
    { count: rawCount },
    { count: sheetCount },
    { data: todayOrders },
    { data: openOrders },
    { data: nextDeliveries },
  ] = await Promise.all([
    supabase
      .from("raw_materials")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization.id),
    supabase
      .from("technical_sheets")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization.id),
    supabase
      .from("orders")
      .select("net_amount, total_amount, amount_paid")
      .eq("organization_id", organization.id)
      .eq("order_date", todayStr),
    // pedidos abertos com saldo a receber
    supabase
      .from("orders")
      .select("total_amount, amount_paid, order_status, payment_status")
      .eq("organization_id", organization.id)
      .in("payment_status", ["nao_pago", "sinal_pago"])
      .not("order_status", "in", "(entregue,cancelado)"),
    // próximas entregas
    supabase
      .from("orders")
      .select(
        "id, order_number, customer_name, delivery_date, delivery_type, total_amount, order_status",
      )
      .eq("organization_id", organization.id)
      .gte("delivery_date", todayStr)
      .lte("delivery_date", tomorrowStr)
      .not("order_status", "in", "(entregue,cancelado)")
      .order("delivery_date", { ascending: true })
      .limit(8),
  ]);

  const grossToday = (todayOrders ?? []).reduce(
    (acc, o) => acc + Number(o.total_amount ?? 0),
    0,
  );
  const netToday = (todayOrders ?? []).reduce(
    (acc, o) => acc + Number(o.net_amount ?? 0),
    0,
  );
  const receivedToday = (todayOrders ?? []).reduce(
    (acc, o) => acc + Number(o.amount_paid ?? 0),
    0,
  );

  const receivable = (openOrders ?? []).reduce(
    (acc, o) =>
      acc + Math.max(0, Number(o.total_amount ?? 0) - Number(o.amount_paid ?? 0)),
    0,
  );

  const inProductionStatuses = new Set(["novo", "confirmado", "em_producao"]);
  const pendingProduction = (openOrders ?? []).filter((o) =>
    inProductionStatuses.has(String(o.order_status)),
  ).length;

  const cards: KpiCard[] = [
    {
      label: "Total a receber",
      value: formatCurrency(receivable),
      hint: "saldos em aberto (não pago + sinal pago)",
      tone: receivable > 0 ? "warn" : "default",
    },
    {
      label: "Recebido hoje",
      value: formatCurrency(receivedToday),
      hint: "entradas confirmadas no dia",
      tone: "good",
    },
    {
      label: "Pedidos a produzir",
      value: String(pendingProduction),
      hint: "novo + confirmado + em produção",
    },
    {
      label: "Próximas entregas (24h)",
      value: String((nextDeliveries ?? []).length),
      hint: "hoje e amanhã",
    },
    {
      label: "Vendas brutas hoje",
      value: formatCurrency(grossToday),
      hint: "antes das taxas de plataforma",
    },
    {
      label: "Líquido após taxas",
      value: formatCurrency(netToday),
      hint: "balcão + canais combinados",
    },
    {
      label: "Matérias cadastradas",
      value: String(rawCount ?? 0),
    },
    {
      label: "Fichas técnicas",
      value: String(sheetCount ?? 0),
    },
  ];

  const isEmpty = (rawCount ?? 0) === 0 && (sheetCount ?? 0) === 0;

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-[var(--color-slate)]">Bem-vindo de volta</p>
        <h2 className="font-serif text-3xl text-[var(--color-navy)]">
          {organization.name}
        </h2>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <article
            key={c.label}
            className={
              "rounded-lg border bg-white p-5 " +
              (c.tone === "warn"
                ? "border-amber-200"
                : c.tone === "good"
                  ? "border-emerald-200"
                  : c.tone === "danger"
                    ? "border-red-200"
                    : "border-[var(--border)]")
            }
          >
            <p className="text-xs uppercase tracking-widest text-[var(--color-slate)]">
              {c.label}
            </p>
            <p
              className={
                "mt-2 font-serif text-3xl " +
                (c.tone === "warn"
                  ? "text-amber-800"
                  : c.tone === "good"
                    ? "text-emerald-800"
                    : c.tone === "danger"
                      ? "text-red-800"
                      : "text-[var(--color-navy)]")
              }
            >
              {c.value}
            </p>
            {c.hint ? (
              <p className="mt-2 text-xs text-[var(--color-slate)]">{c.hint}</p>
            ) : null}
          </article>
        ))}
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-white p-5">
        <header className="flex items-center justify-between gap-2">
          <h3 className="font-serif text-lg text-[var(--color-navy)]">
            Entregas das próximas 24h
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
            Nenhuma entrega agendada para hoje ou amanhã.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--border)]">
            {((nextDeliveries ?? []) as unknown as Array<{
              id: string;
              order_number: number;
              customer_name: string | null;
              delivery_date: string;
              delivery_type: string;
              total_amount: number;
              order_status: string;
            }>).map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs text-[var(--color-slate)]">
                    #{String(o.order_number).padStart(3, "0")} ·{" "}
                    {o.delivery_date} · {o.delivery_type}
                  </p>
                  <p className="truncate font-medium text-[var(--color-navy)]">
                    {o.customer_name ?? "Sem cliente"}
                  </p>
                </div>
                <span className="shrink-0 font-medium text-[var(--color-navy)]">
                  {formatCurrency(Number(o.total_amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isEmpty ? (
        <section className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--color-cream-50)] p-6">
          <h3 className="font-serif text-xl text-[var(--color-navy)]">
            Vamos pelo começo
          </h3>
          <p className="mt-2 text-sm text-[var(--color-slate)]">
            Cadastre suas matérias primas para o Brownie-se começar a calcular
            fichas técnicas e CMV automaticamente.
          </p>
          <Link
            href="/materias-primas"
            className="mt-4 inline-flex items-center rounded-md bg-[var(--color-brown)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brown-600)]"
          >
            Cadastrar primeira matéria prima
          </Link>
        </section>
      ) : null}
    </div>
  );
}
