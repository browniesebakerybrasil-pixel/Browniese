import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrganization } from "@/lib/auth/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, TD, TH, THead, TR } from "@/components/ui/table";
import { SupplyForm } from "@/components/insumos/supply-form";
import { SupplyIngredientForm } from "@/components/insumos/supply-ingredient-form";
import { RemoveSupplyIngredientButton } from "@/components/insumos/remove-ingredient-button";
import { DeleteSupply } from "@/components/insumos/delete-supply-button";
import { convertQuantity, formatCurrency, type Unit } from "@/lib/utils";
import type { RawMaterial, Supply } from "@/types";

export const metadata = { title: "Editar insumo" };

export default async function SupplyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organization } = await requireOrganization();
  const supabase = createAdminClient();

  const { data: supply } = await supabase
    .from("supplies")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!supply) notFound();
  const s = supply as Supply;

  const [{ data: ingredients }, { data: materials }] = await Promise.all([
    supabase
      .from("supply_ingredients")
      .select(
        "id, quantity, unit, raw_material:raw_materials(id, name, unit, effective_cost_per_unit)",
      )
      .eq("supply_id", id),
    supabase
      .from("raw_materials")
      .select("*")
      .eq("organization_id", organization.id)
      .order("name"),
  ]);

  const rawMaterials = (materials ?? []) as RawMaterial[];

  type IngredientRow = {
    id: string;
    quantity: number;
    unit: string;
    raw_material: {
      id: string;
      name: string;
      unit: string;
      effective_cost_per_unit: number;
    } | null;
  };
  const rows = (ingredients ?? []) as unknown as IngredientRow[];

  // Calcula custo contribuido por ingrediente + total.
  // Se as unidades forem incompativeis, retorna 0 e sinaliza.
  const enriched = rows.map((row) => {
    if (!row.raw_material) return { ...row, contribution: 0, error: true };
    try {
      const qtyInRmUnit = convertQuantity(
        Number(row.quantity),
        row.unit as Unit,
        row.raw_material.unit as Unit,
      );
      const contribution =
        qtyInRmUnit * Number(row.raw_material.effective_cost_per_unit ?? 0);
      return { ...row, contribution, error: false };
    } catch {
      return { ...row, contribution: 0, error: true };
    }
  });

  const liveTotal = enriched.reduce((acc, r) => acc + r.contribution, 0);
  const liveUnit = liveTotal / Math.max(1, Number(s.yield_quantity));

  return (
    <div className="space-y-6">
      <CardHeader
        title={s.name}
        description={`Rendimento: ${Number(s.yield_quantity)} ${s.yield_unit}`}
        action={
          <Link
            href="/insumos"
            className="text-sm text-[var(--color-slate)] hover:underline"
          >
            Voltar
          </Link>
        }
      />

      {/* Painel de custo em destaque */}
      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-lg border border-[var(--border)] bg-white p-5">
          <p className="text-xs uppercase tracking-widest text-[var(--color-slate)]">
            Custo total do insumo
          </p>
          <p className="mt-2 font-serif text-3xl text-[var(--color-navy)]">
            {formatCurrency(liveTotal)}
          </p>
          <p className="mt-1 text-xs text-[var(--color-slate)]">
            Σ (custo efetivo da matéria × quantidade usada)
          </p>
        </article>
        <article className="rounded-lg border border-[var(--border)] bg-white p-5">
          <p className="text-xs uppercase tracking-widest text-[var(--color-slate)]">
            Custo por {s.yield_unit}
          </p>
          <p className="mt-2 font-serif text-3xl text-[var(--color-navy)]">
            {formatCurrency(liveUnit)}
          </p>
          <p className="mt-1 text-xs text-[var(--color-slate)]">
            custo_total / rendimento ({Number(s.yield_quantity)} {s.yield_unit})
          </p>
        </article>
        <article className="rounded-lg border border-[var(--border)] bg-[var(--color-cream-50)] p-5">
          <p className="text-xs uppercase tracking-widest text-[var(--color-slate)]">
            Persistido no banco
          </p>
          <p className="mt-2 font-serif text-2xl text-[var(--color-slate)]">
            {formatCurrency(Number(s.total_cost))} ·{" "}
            {formatCurrency(Number(s.cost_per_unit))}/{s.yield_unit}
          </p>
          <p className="mt-1 text-xs text-[var(--color-slate)]">
            Atualiza automaticamente a cada alteração de ingredientes.
          </p>
        </article>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <h3 className="font-serif text-lg text-[var(--color-navy)]">
            Ingredientes
          </h3>
          <p className="mt-1 text-xs text-[var(--color-slate)]">
            Adicione as matérias primas que entram nesta receita. O custo é
            recalculado a cada mudança.
          </p>

          <div className="mt-4">
            {enriched.length === 0 ? (
              <p className="rounded-md border border-dashed border-[var(--border)] bg-[var(--color-cream-50)] p-4 text-sm text-[var(--color-slate)]">
                Nenhum ingrediente ainda.
              </p>
            ) : (
              <DataTable>
                <THead>
                  <TR>
                    <TH>Matéria</TH>
                    <TH>Quantidade</TH>
                    <TH>Contribuição</TH>
                    <TH className="text-right">Ação</TH>
                  </TR>
                </THead>
                <tbody>
                  {enriched.map((row) => (
                    <TR key={row.id}>
                      <TD>
                        {row.raw_material ? (
                          <Link
                            href={`/materias-primas/${row.raw_material.id}`}
                            className="text-[var(--color-navy)] hover:underline"
                          >
                            {row.raw_material.name}
                          </Link>
                        ) : (
                          <span className="text-[var(--color-slate)]">—</span>
                        )}
                      </TD>
                      <TD>
                        {Number(row.quantity)} {row.unit}
                      </TD>
                      <TD
                        className={
                          row.error
                            ? "text-xs text-red-700"
                            : "font-medium text-[var(--color-navy)]"
                        }
                      >
                        {row.error
                          ? "unidades incompatíveis"
                          : formatCurrency(row.contribution)}
                      </TD>
                      <TD className="text-right">
                        <RemoveSupplyIngredientButton
                          supplyId={s.id}
                          ingredientId={row.id}
                        />
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </DataTable>
            )}
          </div>

          <div className="mt-6 border-t border-[var(--border)] pt-4">
            <h4 className="text-sm font-medium text-[var(--color-navy)]">
              Adicionar ingrediente
            </h4>
            <p className="mt-1 text-xs text-[var(--color-slate)]">
              {rawMaterials.length === 0
                ? "Cadastre matérias primas primeiro."
                : "Selecione a matéria, informe quantidade e unidade."}
            </p>
            {rawMaterials.length > 0 ? (
              <div className="mt-3">
                <SupplyIngredientForm
                  supplyId={s.id}
                  rawMaterials={rawMaterials}
                />
              </div>
            ) : (
              <Link
                href="/materias-primas/nova"
                className="mt-2 inline-block text-sm text-[var(--color-brown)] hover:underline"
              >
                Cadastrar matéria prima
              </Link>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="font-serif text-lg text-[var(--color-navy)]">
            Dados do insumo
          </h3>
          <div className="mt-3">
            <SupplyForm mode="edit" supply={s} />
          </div>
          <div className="mt-6 border-t border-[var(--border)] pt-4">
            <DeleteSupply id={s.id} name={s.name} />
          </div>
        </Card>
      </div>
    </div>
  );
}
