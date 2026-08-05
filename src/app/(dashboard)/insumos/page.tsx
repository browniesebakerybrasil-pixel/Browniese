import Link from "next/link";
import { requireOrganization } from "@/lib/auth/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { CardHeader, EmptyState } from "@/components/ui/card";
import { DataTable, TD, TH, THead, TR } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import type { Supply } from "@/types";

export const metadata = { title: "Insumos" };

export default async function SuppliesPage() {
  const { organization } = await requireOrganization();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("supplies")
    .select("*")
    .eq("organization_id", organization.id)
    .order("name");

  const items = (data ?? []) as Supply[];

  return (
    <div className="space-y-8">
      <CardHeader
        title="Insumos"
        description="Preparos intermediários feitos a partir de matérias primas: molhos, massas, recheios. Servem como blocos para montar fichas técnicas."
        action={
          <Link href="/insumos/novo">
            <Button>+ Novo insumo</Button>
          </Link>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          title="Nenhum insumo ainda"
          description="Crie seu primeiro preparo (ex.: molho da casa) usando matérias primas como ingredientes."
          action={
            <Link href="/insumos/novo">
              <Button>Criar primeiro insumo</Button>
            </Link>
          }
        />
      ) : (
        <DataTable>
          <THead>
            <TR>
              <TH>Insumo</TH>
              <TH>Rendimento</TH>
              <TH>Custo total</TH>
              <TH>Custo / unidade</TH>
              <TH className="text-right">Ações</TH>
            </TR>
          </THead>
          <tbody>
            {items.map((s) => (
              <TR key={s.id}>
                <TD className="font-medium text-[var(--color-navy)]">
                  <Link href={`/insumos/${s.id}`} className="hover:underline">
                    {s.name}
                  </Link>
                </TD>
                <TD>
                  {Number(s.yield_quantity)} {s.yield_unit}
                </TD>
                <TD>{formatCurrency(Number(s.total_cost))}</TD>
                <TD className="font-mono text-xs">
                  {formatCurrency(Number(s.cost_per_unit))} / {s.yield_unit}
                </TD>
                <TD className="text-right">
                  <Link href={`/insumos/${s.id}`}>
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
