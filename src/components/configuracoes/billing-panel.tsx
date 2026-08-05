"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { openBillingPortal } from "@/app/(dashboard)/planos/actions";

export function BillingPanel({ hasSubscription }: { hasSubscription: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/planos">
          <Button variant="secondary">Ver planos</Button>
        </Link>
        {hasSubscription ? (
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => start(() => void openBillingPortal())}
          >
            {pending ? "Abrindo portal..." : "Gerenciar cobrança (Stripe)"}
          </Button>
        ) : null}
      </div>
      {!hasSubscription ? (
        <p className="text-xs text-[var(--color-slate)]">
          Você ainda não tem assinatura. Escolha um plano para liberar todos
          os módulos.
        </p>
      ) : null}
    </div>
  );
}
