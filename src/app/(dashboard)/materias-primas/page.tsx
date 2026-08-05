import Link from "next/link";
import { requireOrganization } from "@/lib/auth/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import { CardHeader, EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, TD, TH, THead, TR } from "@/components/ui/table";
import { formatCurrency, formatPercent, formatUnitCost } from "@/lib/utils";
import type { RawMaterial, Unit } from "@/types";

export const metadata = { title: "Matérias primas" };

export default async function RawMaterialsPage() {
  const { organization } = await requireOrganization();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("raw_materials")
    .select("*")
    .eq("organization_id", organization.id)
    .order("name");

  const items = (data ?? []) as RawMaterial[];

  return (
    <div className="space-y-8">
      <CardHeader
        title="Matérias primas"
        description="Cadastre cada insumo cru com sua embalagem e custo total. O Brownie-se calcula sozinho o custo por grama, ml ou unidade."
        action={
          <Link href="/materias-primas/nova">
            <Button>+ Nova matéria prima</Button>
          </Link>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          title="Sua despensa está vazia"
          description="Cadastre a primeira matéria prima para começar a montar insumos e fichas técnicas."
          action={
            <Link href="/materias-primas/nova">
              <Button>Cadastrar primeira matéria</Button>
            </Link>
          }
        />
      ) : (
        <DataTable>
          <THead>
            <TR>
              <TH>Nome</TH>
              <TH>Embalagem</TH>
              <TH>Custo</TH>
              <TH>Desperdício</TH>
              <TH>Custo efetivo</TH>
              <TH className="text-right">Ações</TH>
            </TR>
          </THead>
          <tbody>
            {items.map((m) => (
              <TR key={m.id}>
                <TD className="font-medium text-[var(--color-navy)]">
                  <Link href={`/materias-primas/${m.id}`} className="hover:underline">
                    {m.name}
                  </Link>
                </TD>
                <TD>
                  {Number(m.quantity)} {m.unit}
                </TD>
                <TD>{formatCurrency(Number(m.total_cost))}</TD>
                <TD>{formatPercent(Number(m.waste_percentage), 1)}</TD>
                <TD className="font-mono text-xs">
                  {formatUnitCost(Number(m.effective_cost_per_unit), m.unit as Unit)}
                </TD>
                <TD className="text-right">
                  <Link href={`/materias-primas/${m.id}`}>
                    <Button variant="secondary" size="sm">
                      Editar
                    </Button>
                  </Link>
                </TD>
              </TR>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  );
}
