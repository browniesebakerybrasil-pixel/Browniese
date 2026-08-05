"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteFixedCost } from "@/app/(dashboard)/financeiro/actions";

export function DeleteFixedCostButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Excluir este custo?")) return;
        start(() => {
          void deleteFixedCost(id).catch(() => undefined);
        });
      }}
    >
      Excluir
    </Button>
  );
}
