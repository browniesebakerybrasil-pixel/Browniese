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
import type { RawMaterial, Supply, TechnicalSheet } from "@/types";

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

  const [
    { data: ingredients },
    { data: rawMaterials },
    { data: supplies },
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
  ]);

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

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
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
    </div>
  );
}

function Kpi({
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
      <p className="mt-2 font-serif text-2xl text-[var(--color-navy)]">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--color-slate)]">{hint}</p>
      ) : null}
    </article>
  );
}
