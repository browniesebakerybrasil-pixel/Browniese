import Link from "next/link";
import { requireOrganization } from "@/lib/auth/organization";
import { Card, CardHeader } from "@/components/ui/card";
import { OrgSettingsForm } from "@/components/configuracoes/org-settings-form";
import { BillingPanel } from "@/components/configuracoes/billing-panel";
import { PLAN_LABEL } from "@/lib/stripe/client";

export const metadata = { title: "Configurações" };

interface Props {
  searchParams: Promise<{ checkout?: string; upgrade?: string }>;
}

export default async function SettingsPage({ searchParams }: Props) {
  const { organization } = await requireOrganization();
  const params = await searchParams;

  return (
    <div className="space-y-8">
      <CardHeader
        title="Configurações"
        description="Edite informações do negócio e gerencie sua assinatura."
      />

      {params.checkout === "success" ? (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
          Assinatura ativada. Os módulos do seu novo plano já estão
          disponíveis.
        </p>
      ) : null}

      {params.upgrade ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          O módulo &quot;{params.upgrade}&quot; não está no seu plano atual.{" "}
          <Link href="/planos" className="font-medium underline">
            Ver planos
          </Link>
          .
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="font-serif text-lg text-[var(--color-navy)]">
            Informações do negócio
          </h3>
          <div className="mt-4">
            <OrgSettingsForm organization={organization} />
          </div>
        </Card>

        <Card>
          <h3 className="font-serif text-lg text-[var(--color-navy)]">
            Plano e cobrança
          </h3>
          <p className="mt-1 text-sm text-[var(--color-slate)]">
            Plano atual:{" "}
            <span className="font-medium text-[var(--color-navy)]">
              {PLAN_LABEL[organization.plan]}
            </span>{" "}
            ({organization.plan_status})
          </p>
          <div className="mt-4">
            <BillingPanel hasSubscription={!!organization.stripe_customer_id} />
          </div>
        </Card>
      </div>
    </div>
  );
}
