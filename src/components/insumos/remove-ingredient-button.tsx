"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { removeSupplyIngredient } from "@/app/(dashboard)/insumos/actions";

export function RemoveSupplyIngredientButton({
  supplyId,
  ingredientId,
}: {
  supplyId: string;
  ingredientId: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Remover este ingrediente do insumo?")) return;
        start(() => {
          void removeSupplyIngredient(supplyId, ingredientId).catch(
            () => undefined,
          );
        });
      }}
    >
      Remover
    </Button>
  );
}
