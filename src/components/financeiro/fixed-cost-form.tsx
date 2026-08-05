"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select } from "@/components/ui/input";
import { createFixedCost } from "@/app/(dashboard)/financeiro/actions";
import { emptyActionState, type ActionState } from "@/lib/validation";

const CATEGORIES = [
  { value: "aluguel", label: "Aluguel" },
  { value: "energia", label: "Energia" },
  { value: "gas", label: "Gás" },
  { value: "internet", label: "Internet" },
  { value: "mao_de_obra", label: "Mão de obra" },
  { value: "outros", label: "Outros" },
];

export function FixedCostForm({ defaultMonth }: { defaultMonth: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createFixedCost,
    emptyActionState(),
  );

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" required placeholder="Aluguel da loja" />
        <FieldError message={state.fieldErrors?.name?.[0]} />
      </div>
      <div>
        <Label htmlFor="category">Categoria</Label>
        <Select id="category" name="category" defaultValue="outros">
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="amount" hint="R$">
            Valor
          </Label>
          <Input
            id="amount"
            name="amount"
            inputMode="decimal"
            required
            placeholder="3500,00"
          />
          <FieldError message={state.fieldErrors?.amount?.[0]} />
        </div>
        <div>
          <Label htmlFor="reference_month">Mês</Label>
          <Input
            id="reference_month"
            name="reference_month"
            type="date"
            defaultValue={defaultMonth}
          />
        </div>
      </div>
      {state.error && !state.fieldErrors ? (
        <p className="text-sm text-red-700">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="text-sm text-emerald-700">Salvo.</p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Adicionar"}
        </Button>
      </div>
    </form>
  );
}
