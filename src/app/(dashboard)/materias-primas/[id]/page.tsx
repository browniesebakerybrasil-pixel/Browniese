import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrganization } from "@/lib/auth/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader } from "@/components/ui/card";
import { RawMaterialForm } from "@/components/materias/raw-material-form";
import { DeleteRawMaterialButton } from "@/components/materias/delete-raw-material-button";
import { formatCurrency, formatUnitCost } from "@/lib/utils";
import type { RawMaterial, Unit, Supply, TechnicalSheet } from "@/types";

export const metadata = { title: "Editar matéria prima" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RawMaterialDetailPage({ params }: Props) {
  const { id } = await params;
  const { organization } = await requireOrganization();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("raw_materials")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (error) console.error(error);
  if (!data) notFound();
  const material = data as RawMaterial;

  // Onde-é-usado
  const { data: supplyUsage } = await supabase
    .from("supply_ingredients")
    .select("supply:supplies(id, name)")
    .eq("raw_material_id", id);
  const { data: sheetUsage } = await supabase
    .from("sheet_ingredients")
    .select("sheet:technical_sheets(id, name)")
    .eq("raw_material_id", id);

  const supplies = (supplyUsage ?? [])
    .map(
      (r) =>
        (r as unknown as { supply: Pick<Supply, "id" | "name"> | null }).supply,
    )
    .filter((s): s is Pick<Supply, "id" | "name"> => !!s);

  const sheets = (sheetUsage ?? [])
    .map(
      (r) =>
        (r as unknown as { sheet: Pick<TechnicalSheet, "id" | "name"> | null })
          .sheet,
    )
    .filter((s): s is Pick<TechnicalSheet, "id" | "name"> => !!s);

  return (
    <div className="space-y-6">
      <CardHeader
        title={material.name}
        description={`${Number(material.quantity)} ${material.unit} · ${formatCurrency(
          Number(material.total_cost),
        )} · ${formatUnitCost(Number(material.effective_cost_per_unit), material.unit as Unit)} (efetivo)`}
        action={
          <Link
            href="/materias-primas"
            className="text-sm text-[var(--color-slate)] hover:underline"
          >
            Voltar
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <h3 className="font-serif text-lg text-[var(--color-navy)]">
            Editar
          </h3>
          <p className="mt-1 text-xs text-[var(--color-slate)]">
            Ao salvar, todos os insumos e fichas que usam esta matéria serão
            recalculados automaticamente.
          </p>
          <div className="mt-4">
            <RawMaterialForm mode="edit" material={material} />
          </div>
          <div className="mt-6 border-t border-[var(--border)] pt-4">
            <DeleteRawMaterialButton id={material.id} name={material.name} />
          </div>
        </Card>

        <Card>
          <h3 className="font-serif text-lg text-[var(--color-navy)]">
            Onde está sendo usado
          </h3>
          <UsageList title="Insumos" items={supplies} hrefPrefix="/insumos" />
          <UsageList
            title="Fichas técnicas"
            items={sheets}
            hrefPrefix="/fichas-tecnicas"
          />
        </Card>
      </div>
    </div>
  );
}

function UsageList({
  title,
  items,
  hrefPrefix,
}: {
  title: string;
  items: Array<{ id: string; name: string }>;
  hrefPrefix: string;
}) {
  return (
    <div className="mt-4">
      <p className="text-xs uppercase tracking-widest text-[var(--color-slate)]">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--color-slate)]">—</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {items.map((i) => (
            <li key={i.id}>
              <Link
                href={`${hrefPrefix}/${i.id}`}
                className="text-sm text-[var(--color-navy)] hover:underline"
              >
                {i.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
