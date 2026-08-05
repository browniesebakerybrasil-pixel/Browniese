"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteCustomer } from "@/app/(dashboard)/clientes/actions";

export function DeleteCustomerButton({
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
        if (!confirm(`Excluir "${name}"? Pedidos antigos ficam preservados sem vínculo.`)) {
          return;
        }
        start(() => {
          void deleteCustomer(id).catch(() => undefined);
        });
      }}
    >
      Excluir cliente
    </Button>
  );
}
