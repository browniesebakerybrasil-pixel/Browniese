"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { CustomerCard } from "./customer-card";
import { EmptyState } from "@/components/ui/card";
import type { Customer } from "@/types";

/**
 * Lista de clientes com busca client-side por nome ou WhatsApp.
 * Para volumes acima de algumas centenas, depois trocamos por busca server-side
 * com debounce — por ora client side é suficiente e instantâneo.
 */
export function CustomerSearch({ customers }: { customers: Customer[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((c) => {
      const name = c.name.toLowerCase();
      const phone = (c.whatsapp ?? "").toLowerCase();
      return name.includes(term) || phone.includes(term);
    });
  }, [q, customers]);

  return (
    <div className="space-y-4">
      <Input
        type="search"
        placeholder="Buscar por nome ou WhatsApp"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhum cliente"
          description={q ? `Sem resultados para "${q}".` : "Cadastre seu primeiro cliente."}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <CustomerCard key={c.id} customer={c} />
          ))}
        </div>
      )}
    </div>
  );
}
