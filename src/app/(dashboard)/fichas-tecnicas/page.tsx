import Link from "next/link";
import { requireOrganization } from "@/lib/auth/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { CardHeader, EmptyState } from "@/components/ui/card";
import { DataTable, TD, TH, THead, TR } from "@/components/ui/table";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { TechnicalSheet } from "@/types";

export const metadata = { title: "Fichas técnicas" };

export default async function SheetsPage() {
  const { organization } = await requireOrganization();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("technical_sheets")
    .select("*")
    .eq("organization_id", organization.id)
    .order("name");
  const items = (data ?? []) as TechnicalSheet[];

  return (
    <div className="space-y-8">
      <CardHeader
        title="Fichas técnicas"
        description="Cada ficha cruza ingredientes (matérias e insumos) com custos fixos rateados. O Brownie-se mostra CMV%, markup e preço sugerido em tempo real."
        action={
          <Link href="/fichas-tecnicas/nova">
            <Button>+ Nova ficha</Button>
          </Link>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          title="Nenhuma ficha técnica"
          description="Crie a primeira ficha para precificar seus produtos."
          action={
            <Link href="/fichas-tecnicas/nova">
              <Button>Nova ficha</Button>
            </Link>
          }
        />
      ) : (
        <DataTable>
          <THead>
            <TR>
              <TH>Produto</TH>
              <TH>Categoria</TH>
              <TH>Custo total</TH>
              <TH>Preço venda</TH>
              <TH>CMV %</TH>
              <TH>Sugerido</TH>
              <TH className="text-right">Ações</TH>
            </TR>
          </THead>
          <tbody>
            {items.map((s) => {
              const cmv = Number(s.cmv_percentage);
              const cmvColor =
                cmv === 0
                  ? "text-[var(--color-slate)]"
                  : cmv > 35
                    ? "text-red-700"
                    : cmv > 25
                      ? "text-amber-700"
                      : "text-emerald-700";
              return (
                <TR key={s.id}>
                  <TD className="font-medium text-[var(--color-navy)]">
                    <Link
                      href={`/fichas-tecnicas/${s.id}`}
                      className="hover:underline"
                    >
                      {s.name}
                    </Link>
                  </TD>
                  <TD className="text-[var(--color-slate)]">
                    {s.category ?? "—"}
                  </TD>
                  <TD>{formatCurrency(Number(s.total_cost))}</TD>
                  <TD>{formatCurrency(Number(s.sale_price))}</TD>
                  <TD className={cmvColor}>{formatPercent(cmv)}</TD>
                  <TD>{formatCurrency(Number(s.suggested_price))}</TD>
                  <TD className="text-right">
                    <Link href={`/fichas-tecnicas/${s.id}`}>
                      <Button variant="secondary" size="sm">
                        Editar
                      </Button>
                    </Link>
                  </TD>
                </TR>
              );
            })}
          </tbody>
        </DataTable>
      )}
    </div>
  );
}
