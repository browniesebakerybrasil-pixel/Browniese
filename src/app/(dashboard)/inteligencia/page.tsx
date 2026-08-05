import { redirect } from "next/navigation";
import { requireOrganization } from "@/lib/auth/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import { CardHeader, Card } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/utils";

export const metadata = { title: "Inteligência" };

/**
 * Página Inteligência.
 *
 * Filosofia: 5 blocos de insights, todos em tabela simples. Sem gráficos.
 * Foco em "o que devo fazer com essa informação?".
 *
 *  1. Top 5 mais vendidos (últimos 30 dias) — o que puxar promoção pra virar
 *     mais lucro; o que garantir estoque pra não faltar.
 *  2. Top 5 mais lucrativos (últimos 30 dias) — priorizar em campanhas.
 *  3. Matérias que mais impactam o CMV — onde negociar preço com fornecedor.
 *  4. Fichas com margem baixa (< 30%) — repensar preço ou receita.
 *  5. Fichas sem giro (30+ dias sem venda) — reduzir de linha ou reposicionar.
 */
export default async function IntelligencePage() {
  const { organization } = await requireOrganization();
  if (organization.plan === "basico") {
    redirect("/configuracoes?upgrade=inteligencia");
  }
  const supabase = createAdminClient();

  // Janela de análise: últimos 30 dias.
  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(today.getDate() - 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  // 1) Pedidos + itens da janela
  const { data: recentOrders } = await supabase
    .from("orders")
    .select("id, order_date, order_status")
    .eq("organization_id", organization.id)
    .gte("order_date", cutoffStr)
    .not("order_status", "eq", "cancelado");

  const orderIds = (recentOrders ?? []).map((o) => (o as { id: string }).id);

  const { data: items } = orderIds.length
    ? await supabase
        .from("order_items")
        .select(
          "product_name, quantity, unit_price, total_price, technical_sheet_id, sheet:technical_sheets(id, name, cost_per_unit)",
        )
        .in("order_id", orderIds)
    : { data: [] as unknown[] };

  type ItemRow = {
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    technical_sheet_id: string | null;
    sheet: { id: string; name: string; cost_per_unit: number } | null;
  };
  const rows = (items ?? []) as unknown as ItemRow[];

  // Aggregação por produto (usando technical_sheet_id como chave primária,
  // fallback pro product_name pra pegar avulsos digitados a mão).
  const byProduct = new Map<
    string,
    {
      name: string;
      qty: number;
      gross: number;
      cost: number;
    }
  >();

  for (const r of rows) {
    const key = r.technical_sheet_id ?? `avulso:${r.product_name}`;
    const name = r.sheet?.name ?? r.product_name;
    const qty = Number(r.quantity) || 0;
    const gross = Number(r.total_price) || 0;
    const unitCost = Number(r.sheet?.cost_per_unit ?? 0);
    const cost = unitCost * qty;
    const cur = byProduct.get(key);
    if (cur) {
      cur.qty += qty;
      cur.gross += gross;
      cur.cost += cost;
    } else {
      byProduct.set(key, { name, qty, gross, cost });
    }
  }

  const productsAgg = Array.from(byProduct.values());
  const topSold = [...productsAgg].sort((a, b) => b.qty - a.qty).slice(0, 5);
  const topProfit = [...productsAgg]
    .map((p) => ({ ...p, profit: p.gross - p.cost }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);

  // 2) Fichas técnicas — margem, sem giro
  const { data: sheets } = await supabase
    .from("technical_sheets")
    .select(
      "id, name, sale_price, cost_per_unit, cmv_percentage, updated_at",
    )
    .eq("organization_id", organization.id);

  type Sheet = {
    id: string;
    name: string;
    sale_price: number;
    cost_per_unit: number;
    cmv_percentage: number;
    updated_at: string;
  };
  const sheetList = (sheets ?? []) as Sheet[];

  const lowMargin = sheetList
    .map((s) => {
      const price = Number(s.sale_price);
      const cost = Number(s.cost_per_unit);
      const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
      return { ...s, margin };
    })
    .filter((s) => Number(s.sale_price) > 0 && s.margin < 30)
    .sort((a, b) => a.margin - b.margin)
    .slice(0, 5);

  const soldSheetIds = new Set(
    rows.map((r) => r.technical_sheet_id).filter(Boolean) as string[],
  );
  const noMovement = sheetList
    .filter((s) => !soldSheetIds.has(s.id))
    .slice(0, 5);

  // 3) Matérias primas — impacto no CMV
  // Consulta sheet_ingredients + supply_ingredients pra somar quanto cada
  // materia contribuiu, ponderada pelas vendas dos ultimos 30 dias.
  const { data: sheetIngredients } = await supabase
    .from("sheet_ingredients")
    .select(
      "sheet_id, quantity, unit, raw_material_id, raw_material:raw_materials(id, name, unit, effective_cost_per_unit), supply_id, supply:supplies(id, cost_per_unit)",
    )
    .in(
      "sheet_id",
      sheetList.map((s) => s.id).length ? sheetList.map((s) => s.id) : ["_"],
    );

  // Contagem de vendas por sheet_id
  const salesBySheet = new Map<string, number>();
  for (const r of rows) {
    if (!r.technical_sheet_id) continue;
    salesBySheet.set(
      r.technical_sheet_id,
      (salesBySheet.get(r.technical_sheet_id) ?? 0) + (Number(r.quantity) || 0),
    );
  }

  type SheetIngRow = {
    sheet_id: string;
    quantity: number;
    unit: string;
    raw_material_id: string | null;
    raw_material: {
      id: string;
      name: string;
      unit: string;
      effective_cost_per_unit: number;
    } | null;
    supply_id: string | null;
    supply: { id: string; cost_per_unit: number } | null;
  };
  const ings = (sheetIngredients ?? []) as unknown as SheetIngRow[];

  const impactByMaterial = new Map<
    string,
    { name: string; impact: number }
  >();
  for (const ing of ings) {
    if (!ing.raw_material) continue;
    const sold = salesBySheet.get(ing.sheet_id) ?? 0;
    if (sold === 0) continue;
    const contribution =
      Number(ing.quantity) *
      Number(ing.raw_material.effective_cost_per_unit ?? 0) *
      sold;
    const cur = impactByMaterial.get(ing.raw_material.id);
    if (cur) cur.impact += contribution;
    else
      impactByMaterial.set(ing.raw_material.id, {
        name: ing.raw_material.name,
        impact: contribution,
      });
  }
  const topMaterialsImpact = Array.from(impactByMaterial.values())
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <CardHeader
        title="Inteligência"
        description="Insights automáticos dos últimos 30 dias. Foco em decisão, não em painel."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top vendidos */}
        <Card>
          <SectionHeader
            title="Top 5 mais vendidos"
            hint="por quantidade nos últimos 30 dias"
          />
          {topSold.length === 0 ? (
            <Empty>Nenhuma venda registrada nos últimos 30 dias.</Empty>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--border)]">
              {topSold.map((p) => (
                <li
                  key={p.name}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="text-[var(--color-navy)]">{p.name}</span>
                  <span className="font-mono text-[var(--color-slate)]">
                    {p.qty} un · {formatCurrency(p.gross)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Top lucrativos */}
        <Card>
          <SectionHeader
            title="Top 5 mais lucrativos"
            hint="receita menos CMV (últimos 30 dias)"
          />
          {topProfit.length === 0 ? (
            <Empty>Sem dados suficientes de venda + custo.</Empty>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--border)]">
              {topProfit.map((p) => (
                <li
                  key={p.name}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="text-[var(--color-navy)]">{p.name}</span>
                  <span className="font-mono text-emerald-800">
                    +{formatCurrency(p.profit)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Impacto CMV */}
        <Card>
          <SectionHeader
            title="Matérias que mais pesam no CMV"
            hint="ideal pra negociar com fornecedor"
          />
          {topMaterialsImpact.length === 0 ? (
            <Empty>Cadastre fichas e registre vendas pra aparecer aqui.</Empty>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--border)]">
              {topMaterialsImpact.map((m) => (
                <li
                  key={m.name}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="text-[var(--color-navy)]">{m.name}</span>
                  <span className="font-mono text-[var(--color-slate)]">
                    {formatCurrency(m.impact)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Margem baixa */}
        <Card>
          <SectionHeader
            title="Fichas com margem baixa"
            hint="menos de 30% — revise preço ou receita"
          />
          {lowMargin.length === 0 ? (
            <Empty>Todas as fichas com preço estão com margem ≥ 30%. 👍</Empty>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--border)]">
              {lowMargin.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="text-[var(--color-navy)]">{s.name}</span>
                  <span className="font-mono text-amber-800">
                    {formatPercent(s.margin, 1)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Sem giro */}
        <Card className="lg:col-span-2">
          <SectionHeader
            title="Fichas sem venda (30+ dias)"
            hint="reposicionar, promover ou descontinuar"
          />
          {noMovement.length === 0 ? (
            <Empty>Todas as fichas cadastradas venderam nos últimos 30 dias.</Empty>
          ) : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {noMovement.map((s) => (
                <li
                  key={s.id}
                  className="rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--color-navy)]"
                >
                  {s.name}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function SectionHeader({ title, hint }: { title: string; hint: string }) {
  return (
    <div>
      <h3 className="font-serif text-lg text-[var(--color-navy)]">{title}</h3>
      <p className="mt-0.5 text-xs text-[var(--color-slate)]">{hint}</p>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 rounded-md border border-dashed border-[var(--border)] bg-[var(--color-cream-50)] p-3 text-xs text-[var(--color-slate)]">
      {children}
    </p>
  );
}
