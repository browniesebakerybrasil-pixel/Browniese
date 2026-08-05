"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { startCheckout } from "@/app/(dashboard)/planos/actions";
import { formatCurrency } from "@/lib/utils";
import { PLAN_LABEL, PLAN_PRICE_BRL, type PlanKey } from "@/lib/stripe/client";
import type { Plan } from "@/types";

const FEATURES: Record<PlanKey, string[]> = {
  basico: [
    "Matérias primas ilimitadas",
    "Insumos ilimitados",
    "Até 50 fichas técnicas",
    "Canais de venda",
    "Pedidos manuais",
    "Até 2 usuários",
  ],
  full: [
    "Tudo do Básico",
    "Fichas técnicas ilimitadas",
    "Relatório diário completo",
    "Exportação CSV",
    "Comparativo CMV vs preço",
    "Até 5 usuários",
  ],
  master: [
    "Tudo do Full",
    "Financeiro operacional",
    "Custos fixos mensais com rateio",
    "Multi-unidades",
    "Usuários ilimitados",
    "Suporte prioritário",
  ],
};

export function PlanGrid({ currentPlan }: { currentPlan: Plan }) {
  const [pending, start] = useTransition();
  const plans: PlanKey[] = ["basico", "full", "master"];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {plans.map((p) => {
        const isCurrent = currentPlan === p;
        return (
          <Card key={p} className={isCurrent ? "border-[var(--color-brown)]" : ""}>
            <p className="text-sm uppercase tracking-widest text-[var(--color-brown)]">
              {PLAN_LABEL[p]}
            </p>
            <p className="mt-2 font-serif text-3xl text-[var(--color-navy)]">
              {formatCurrency(PLAN_PRICE_BRL[p])}
              <span className="text-base text-[var(--color-slate)]"> /mês</span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-[var(--color-slate)]">
              {FEATURES[p].map((f) => (
                <li key={f}>· {f}</li>
              ))}
            </ul>
            <div className="mt-6">
              {isCurrent ? (
                <Button variant="secondary" disabled>
                  Plano atual
                </Button>
              ) : (
                <Button
                  disabled={pending}
                  onClick={() => start(() => void startCheckout(p))}
                >
                  {pending ? "Abrindo..." : `Assinar ${PLAN_LABEL[p]}`}
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
