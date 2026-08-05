"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteTechnicalSheet } from "@/app/(dashboard)/fichas-tecnicas/actions";

export function DeleteSheetButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="danger"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Excluir a ficha "${name}"?`)) return;
        start(() => {
          void deleteTechnicalSheet(id).catch(() => undefined);
        });
      }}
    >
      Excluir ficha
    </Button>
  );
}
