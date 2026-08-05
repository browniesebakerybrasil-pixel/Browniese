"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteRawMaterial } from "@/app/(dashboard)/materias-primas/actions";

export function DeleteRawMaterialButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <Button
        variant="danger"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Excluir "${name}"? Esta ação não pode ser desfeita.`)) {
            return;
          }
          setError(null);
          start(async () => {
            const res = await deleteRawMaterial(id);
            if (res && res.ok === false) setError(res.error ?? "Erro");
          });
        }}
      >
        Excluir matéria prima
      </Button>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
