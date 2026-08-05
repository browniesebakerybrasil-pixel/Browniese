"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteSupply } from "@/app/(dashboard)/insumos/actions";

export function DeleteSupply({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <Button
        variant="danger"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Excluir o insumo "${name}"?`)) return;
          setError(null);
          start(async () => {
            const res = await deleteSupply(id);
            if (res && res.ok === false) setError(res.error ?? "Erro");
          });
        }}
      >
        Excluir insumo
      </Button>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
