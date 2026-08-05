"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteOrder } from "@/app/(dashboard)/pedidos/actions";

export function DeleteOrderButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Excluir pedido?")) return;
        start(() => {
          void deleteOrder(id).catch(() => undefined);
        });
      }}
    >
      Excluir
    </Button>
  );
}
