"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  FieldError,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui/input";
import {
  createSupply,
  updateSupply,
} from "@/app/(dashboard)/insumos/actions";
import { emptyActionState, type ActionState } from "@/lib/validation";
import type { Supply } from "@/types";

const UNITS = [
  { value: "g", label: "gramas (g)" },
  { value: "kg", label: "quilogramas (kg)" },
  { value: "ml", label: "mililitros (ml)" },
  { value: "l", label: "litros (l)" },
  { value: "un", label: "unidade (un)" },
  { value: "cx", label: "caixa (cx)" },
];

export function SupplyForm({
  mode,
  supply,
}: {
  mode: "create" | "edit";
  supply?: Supply;
}) {
  const action =
    mode === "create" ? createSupply : updateSupply.bind(null, supply!.id);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    emptyActionState(),
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome do insumo</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={supply?.name ?? ""}
          placeholder="Ex.: Molho da casa"
        />
        <FieldError message={state.fieldErrors?.name?.[0]} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="yield_quantity" hint="quanto rende">
            Rendimento
          </Label>
          <Input
            id="yield_quantity"
            name="yield_quantity"
            inputMode="decimal"
            required
            defaultValue={String(supply?.yield_quantity ?? "")}
            placeholder="500"
          />
          <FieldError message={state.fieldErrors?.yield_quantity?.[0]} />
        </div>
        <div>
          <Label htmlFor="yield_unit">Unidade</Label>
          <Select
            id="yield_unit"
            name="yield_unit"
            defaultValue={supply?.yield_unit ?? "g"}
            required
          >
            {UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={supply?.notes ?? ""}
          placeholder="Ex.: Modo de preparo curto, rendimento médio."
        />
      </div>

      {state.error && !state.fieldErrors ? (
        <p className="text-sm text-red-700">{state.error}</p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : mode === "create" ? "Criar" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
