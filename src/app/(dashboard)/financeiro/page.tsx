import { redirect } from "next/navigation";
import { requireOrganization } from "@/lib/auth/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { DataTable, TD, TH, THead, TR } from "@/components/ui/table";
import { FixedCostForm } from "@/components/financeiro/fixed-cost-form";
import { DeleteFixedCostButton } from "@/components/financeiro/delete-fixed-cost-button";
import { formatCurrency } from "@/lib/utils";
import type { FixedCost } from "@/types";

export const metadata = { title: "Financeiro" };

interface Props {
  searchParams: Promise<{ month?: string }>;
}

export default async function FinancePage({ searchParams }: Props) {
  const { organization } = await requireOrganization();
  if (organization.plan !== "master") {
    redirect("/configuracoes?upgrade=financeiro");
  }

  const params = await searchParams;
  const today = new Date();
  const defaultMonth =
    params.month ??
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

  const supabase = createAdminClient();
  const { data: costs } = await supabase
    .from("fixed_costs")
    .select("*")
    .eq("organization_id", organization.id)
    .eq("reference_month", defaultMonth)
    .order("category");

  const items = (costs ?? []) as FixedCost[];
  const total = items.reduce((acc, c) => acc + Number(c.amount), 0);

  return (
    <div className="space-y-8">
      <CardHeader
        title="Financeiro"
        description={`Custos fixos do mês ${defaultMonth}. Total: ${formatCurrency(total)}.`}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          {items.length === 0 ? (
            <EmptyState
              title="Nenhum custo fixo neste mês"
              description="Cadastre aluguel, energia, mão de obra etc. para ratear no resultado."
            />
          ) : (
            <DataTable>
              <THead>
                <TR>
                  <TH>Custo</TH>
                  <TH>Categoria</TH>
                  <TH>Valor</TH>
                  <TH className="text-right">Ação</TH>
                </TR>
              </THead>
              <tbody>
                {items.map((c) => (
                  <TR key={c.id}>
                    <TD className="font-medium text-[var(--color-navy)]">
                      {c.name}
                    </TD>
                    <TD className="text-xs uppercase tracking-widest text-[var(--color-slate)]">
                      {c.category ?? "outros"}
                    </TD>
                    <TD>{formatCurrency(Number(c.amount))}</TD>
                    <TD className="text-right">
                      <DeleteFixedCostButton id={c.id} />
                    </TD>
                  </TR>
                ))}
              </tbody>
            </DataTable>
          )}
        </div>

        <Card>
          <h3 className="font-serif text-lg text-[var(--color-navy)]">
            Novo custo fixo
          </h3>
          <p className="mt-1 text-xs text-[var(--color-slate)]">
            Os valores são usados em relatórios mensais e no cálculo de ponto
            de equilíbrio.
          </p>
          <div className="mt-4">
            <FixedCostForm defaultMonth={defaultMonth} />
          </div>
        </Card>
      </div>
    </div>
  );
}
