"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { bumpCustomerOrderCount } from "@/app/(dashboard)/clientes/actions";

/**
 * Incrementa manualmente o contador de pedidos do cliente. Útil quando o
 * pedido não foi registrado pelo módulo de Pedidos (ex.: venda balcão sem
 * cadastro) e o funcionário quer contar para a fidelidade mesmo assim.
 */
export function BumpOrderCountButton({ customerId }: { customerId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() => {
        start(() => {
          void bumpCustomerOrderCount(customerId).catch(() => undefined);
        });
      }}
    >
      {pending ? "Registrando..." : "+1 pedido"}
    </Button>
  );
}
