"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { removeSheetIngredient } from "@/app/(dashboard)/fichas-tecnicas/actions";

export function RemoveSheetIngredientButton({
  sheetId,
  ingredientId,
}: {
  sheetId: string;
  ingredientId: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Remover ingrediente?")) return;
        start(() => {
          void removeSheetIngredient(sheetId, ingredientId).catch(
            () => undefined,
          );
        });
      }}
    >
      Remover
    </Button>
  );
}
