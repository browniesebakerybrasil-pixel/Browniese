import { requireOrganization } from "@/lib/auth/organization";
import { CardHeader } from "@/components/ui/card";
import { PlanGrid } from "@/components/planos/plan-grid";

export const metadata = { title: "Planos" };

interface Props {
  searchParams: Promise<{ checkout?: string }>;
}

export default async function PlansPage({ searchParams }: Props) {
  const { organization } = await requireOrganization();
  const params = await searchParams;

  return (
    <div className="space-y-8">
      <CardHeader
        title="Planos"
        description={`Plano atual: ${organization.plan} (${organization.plan_status}). Você pode mudar a qualquer momento.`}
      />

      {params.checkout === "cancel" ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Checkout cancelado. Você pode tentar novamente quando quiser.
        </p>
      ) : null}

      <PlanGrid currentPlan={organization.plan} />
    </div>
  );
}
