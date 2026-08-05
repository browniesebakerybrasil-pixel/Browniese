"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  markLoyaltyGift,
  resetLoyaltyGift,
} from "@/app/(dashboard)/clientes/actions";

export function LoyaltyGiftActions({
  customerId,
  giftGiven,
  orderCount,
}: {
  customerId: string;
  giftGiven: boolean;
  orderCount: number;
}) {
  const [pending, start] = useTransition();
  const ready = orderCount >= 10;

  if (giftGiven) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-emerald-700">Mimo já registrado.</p>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => {
            if (!confirm("Resetar o mimo? Use só se foi marcado por engano."))
              return;
            start(() => {
              void resetLoyaltyGift(customerId).catch(() => undefined);
            });
          }}
        >
          Resetar mimo
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant={ready ? "primary" : "secondary"}
      size="sm"
      disabled={pending || !ready}
      onClick={() => {
        if (!ready) return;
        start(() => {
          void markLoyaltyGift(customerId).catch(() => undefined);
        });
      }}
    >
      {pending
        ? "Registrando..."
        : ready
          ? "Marcar mimo entregue hoje"
          : `Faltam ${10 - orderCount} pedidos`}
    </Button>
  );
}
