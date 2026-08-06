import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrganization } from "@/lib/auth/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, TD, TH, THead, TR } from "@/components/ui/table";
import { SheetForm } from "@/components/fichas/sheet-form";
import { SheetIngredientForm } from "@/components/fichas/sheet-ingredient-form";
import { RemoveSheetIngredientButton } from "@/components/fichas/remove-sheet-ingredient-button";
import { DeleteSheetButton } from "@/components/fichas/delete-sheet-button";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { PricingPanel } from "@/components/fichas/pricing-panel";
import { NegotiationSimulator } from "@/components/fichas/negotiation-simulator";
import type {
  PricingTier,
  RawMaterial,
  SheetHistoryEntry,
  Supply,
  TechnicalSheet,
} from "@/types";

export const metadata = { title: "Editar ficha técnica" };

export default async function SheetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organization } = await requireOrganization();
  const supabase = createAdminClient();

  const { data: sheet } = await supabase
    .from("technical_sheets")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!sheet) notFound();
  const s = sheet as TechnicalSheet;

  // Mês corrente (yyyy-mm-01) — usado pra somar despesas fixas e vendas.
  const nowIso = new Date().toISOString();
  const currentMonthStart = `${nowIso.slice(0, 7)}-01`;

  const [
    { data: ingredients },
    { data: rawMaterials },
    { data: supplies },
    { data: history },
    { data: monthFixedCosts },
    { data: monthOrders },
  ] = await Promise.all([
    supabase
      .from("sheet_ingredients")
      .select(
        "id, ingredient_type, quantity, unit, raw_material:raw_materials(id, name), supply:supplies(id, name)",
      )
      .eq("sheet_id", id),
    supabase
      .from("raw_materials")
      .select("*")
      .eq("organization_id", organization.id)
      .order("name"),
    supabase
      .from("supplies")
      .select("*")
      .eq("organization_id", organization.id)
      .order("name"),
    supabase
      .from("sheet_history")
      .select("*")
      .eq("sheet_id", id)
      .order("changed_at", { ascending: false })
      .limit(10),
    supabase
      .from("fixed_costs")
      .select("amount")
      .eq("organization_id", organization.id)
      .eq("reference_month", currentMonthStart),
    supabase
      .from("orders")
      .select("id")
      .eq("organization_id", organization.id)
      .gte("order_date", currentMonthStart)
      .not("order_status", "eq", "cancelado"),
  ]);

  const historyList = (history ?? []) as SheetHistoryEntry[];

  // -------------------------------------------------------------------------
  // Cálculo de rentabilidade por unidade
  //
  //   Lucro Bruto  = Preço − Custo total unitário
  //                  (todas despesas da ficha ja estão em cost_per_unit)
  //
  //   Lucro Líquido Estimado = Lucro Bruto − rateio das despesas fixas
  //                            mensais da empresa (Financeiro), dividido
  //                            proporcionalmente pelas unidades vendidas
  //                            no mês corrente. Se falta dado (sem Financeiro
  //                            ou sem venda no mês), mostra placeholder.
  // -------------------------------------------------------------------------
  const salePrice = Number(s.sale_price);
  const costPerUnit = Number(s.cost_per_unit);
  const grossProfit = salePrice - costPerUnit;

  const monthlyFixedTotal = ((monthFixedCosts ?? []) as Array<{
    amount: number;
  }>).reduce((acc, r) => acc + Number(r.amount ?? 0), 0);

  const monthOrderIds = ((monthOrders ?? []) as Array<{ id: string }>).map(
    (o) => o.id,
  );
  let monthUnitsTotal = 0;
  if (monthOrderIds.length > 0) {
    const { data: monthItems } = await supabase
      .from("order_items")
      .select("quantity")
      .in("order_id", monthOrderIds);
    monthUnitsTotal = ((monthItems ?? []) as Array<{ quantity: number }>).reduce(
      (acc, it) => acc + Number(it.quantity ?? 0),
      0,
    );
  }

  const overheadPerUnit =
    monthlyFixedTotal > 0 && monthUnitsTotal > 0
      ? monthlyFixedTotal / monthUnitsTotal
      : null;

  const netProfit =
    overheadPerUnit != null ? grossProfit - overheadPerUnit : null;

  const netProfitHint =
    overheadPerUnit != null
      ? `após rateio de ${formatCurrency(overheadPerUnit)} por unidade em despesas fixas`
      : "Cadastre despesas fixas em Financeiro para estimar.";

  return (
    <div className="space-y-6">
      <CardHeader
        title={s.name}
        description={s.category ?? "Ficha técnica"}
        action={
          <Link
            href="/fichas-tecnicas"
            className="text-sm text-[var(--color-slate)] hover:underline"
          >
            Voltar
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi
          label="Custo total"
          value={formatCurrency(Number(s.total_cost))}
          hint={`${formatCurrency(Number(s.cost_per_unit))} por unidade`}
        />
        <Kpi
          label="CMV"
          value={formatPercent(Number(s.cmv_percentage))}
          hint="custo / preço de venda"
        />
        <Kpi
          label="Markup"
          value={Number(s.markup).toFixed(2).replace(".", ",") + "x"}
          hint={`margem alvo ${formatPercent(Number(s.desired_margin))}`}
        />
        <Kpi
          label="Preço sugerido"
          value={formatCurrency(Number(s.suggested_price))}
          hint={`mínimo: ${formatCurrency(Number(s.minimum_price))}`}
        />
        <Kpi
          label="Lucro Bruto"
          value={
            salePrice > 0
              ? formatCurrency(grossProfit)
              : "—"
          }
          hint={
            salePrice > 0
              ? "antes das despesas operacionais"
              : "cadastre preço de venda"
          }
          tone={grossProfit > 0 ? "good" : grossProfit < 0 ? "danger" : "default"}
        />
        <Kpi
          label="Lucro Líquido Estimado"
          value={netProfit != null ? formatCurrency(netProfit) : "—"}
          hint={netProfitHint}
          tone={
            netProfit == null
              ? "default"
              : netProfit > 0
                ? "good"
                : "danger"
          }
        />
      </section>

      {/* Painel de preços por canal + preço mínimo absoluto */}
      <PricingPanel
        tiers={(s.pricing_tiers ?? []) as PricingTier[]}
        costPerUnit={costPerUnit}
        absoluteMinPrice={
          s.absolute_min_price != null ? Number(s.absolute_min_price) : null
        }
      />

      {/* Simulador de negociação */}
      <NegotiationSimulator
        costPerUnit={costPerUnit}
        absoluteMinPrice={
          s.absolute_min_price != null ? Number(s.absolute_min_price) : null
        }
        defaultUnitPrice={Number(s.sale_price) || 0}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card>
          <h3 className="font-serif text-lg text-[var(--color-navy)]">
            Ingredientes da receita
          </h3>
          <p className="mt-1 text-xs text-[var(--color-slate)]">
            Misture matérias primas e insumos. Custo recalcula a cada mudança.
          </p>
          <div className="mt-4">
            {(ingredients ?? []).length === 0 ? (
              <p className="rounded-md border border-dashed border-[var(--border)] bg-[var(--color-cream-50)] p-4 text-sm text-[var(--color-slate)]">
                Sem ingredientes ainda.
              </p>
            ) : (
              <DataTable>
                <THead>
                  <TR>
                    <TH>Item</TH>
                    <TH>Tipo</TH>
                    <TH>Quantidade</TH>
                    <TH className="text-right">Ação</TH>
                  </TR>
                </THead>
                <tbody>
                  {(ingredients ?? []).map((ing) => {
                    const row = ing as unknown as {
                      id: string;
                      ingredient_type: "raw_material" | "supply";
                      quantity: number;
                      unit: string;
                      raw_material: { id: string; name: string } | null;
                      supply: { id: string; name: string } | null;
                    };
                    const target =
                      row.ingredient_type === "raw_material"
                        ? row.raw_material
                        : row.supply;
                    const hrefBase =
                      row.ingredient_type === "raw_material"
                        ? "/materias-primas"
                        : "/insumos";
                    return (
                      <TR key={row.id}>
                        <TD>
                          {target ? (
                            <Link
                              href={`${hrefBase}/${target.id}`}
                              className="text-[var(--color-navy)] hover:underline"
                            >
                              {target.name}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </TD>
                        <TD className="text-xs uppercase tracking-widest text-[var(--color-slate)]">
                          {row.ingredient_type === "raw_material"
                            ? "matéria"
                            : "insumo"}
                        </TD>
                        <TD>
                          {Number(row.quantity)} {row.unit}
                        </TD>
                        <TD className="text-right">
                          <RemoveSheetIngredientButton
                            sheetId={s.id}
                            ingredientId={row.id}
                          />
                        </TD>
                      </TR>
                    );
                  })}
                </tbody>
              </DataTable>
            )}
          </div>

          <div className="mt-6 border-t border-[var(--border)] pt-4">
            <h4 className="text-sm font-medium text-[var(--color-navy)]">
              Adicionar ingrediente
            </h4>
            <div className="mt-3">
              <SheetIngredientForm
                sheetId={s.id}
                rawMaterials={(rawMaterials ?? []) as RawMaterial[]}
                supplies={(supplies ?? []) as Supply[]}
              />
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="font-serif text-lg text-[var(--color-navy)]">
            Dados da ficha
          </h3>
          <div className="mt-3">
            <SheetForm mode="edit" sheet={s} />
          </div>
          <div className="mt-6 border-t border-[var(--border)] pt-4">
            <DeleteSheetButton id={s.id} name={s.name} />
          </div>
        </Card>
      </div>

      {/* Histórico — só aparece se tiver eventos registrados */}
      {historyList.length > 0 ? (
        <Card>
          <h3 className="font-serif text-lg text-[var(--color-navy)]">
            Histórico
          </h3>
          <p className="mt-1 text-xs text-[var(--color-slate)]">
            Últimas alterações desta ficha (preço, margem, receita, embalagem).
          </p>
          <ul className="mt-4 divide-y divide-[var(--border)]">
            {historyList.map((h) => (
              <li key={h.id} className="py-3 text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs uppercase tracking-widest text-[var(--color-slate)]">
                    {HISTORY_LABEL[h.event_type] ?? h.event_type}
                  </span>
                  <span className="font-mono text-xs text-[var(--color-slate)]">
                    {formatHistoryDate(h.changed_at)}
                  </span>
                </div>
                <p className="mt-1 text-[var(--color-navy)]">
                  {historyLine(h)}
                </p>
                {h.description ? (
                  <p className="mt-1 text-xs text-[var(--color-slate)]">
                    {h.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

const HISTORY_LABEL: Record<string, string> = {
  price: "Preço",
  margin: "Margem",
  packaging: "Embalagem",
  ingredient_added: "Ingrediente adicionado",
  ingredient_removed: "Ingrediente removido",
  cmv: "CMV",
};

function historyLine(h: SheetHistoryEntry): string {
  if (h.event_type === "ingredient_added") {
    return `+ ${h.to_value ?? ""}`;
  }
  if (h.event_type === "ingredient_removed") {
    return `− ${h.from_value ?? ""}`;
  }
  if (h.from_value && h.to_value) {
    return `${h.from_value} → ${h.to_value}`;
  }
  return h.to_value ?? h.from_value ?? "—";
}

function formatHistoryDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm} ${hh}:${min}`;
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
  tone?: "default" | "good" | "danger" | "warn";
}) {
  const border =
    tone === "good"
      ? "border-emerald-200"
      : tone === "danger"
        ? "border-red-200"
        : tone === "warn"
          ? "border-amber-200"
          : "border-[var(--border)]";
  const color =
    tone === "good"
      ? "text-emerald-800"
      : tone === "danger"
        ? "text-red-800"
        : tone === "warn"
          ? "text-amber-800"
          : "text-[var(--color-navy)]";
  return (
    <article className={`rounded-lg border bg-white p-5 ${border}`}>
      <p className="text-xs uppercase tracking-widest text-[var(--color-slate)]">
        {label}
      </p>
      <p className={`mt-2 font-serif text-2xl ${color}`}>{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--color-slate)]">{hint}</p>
      ) : null}
    </article>
  );
}
