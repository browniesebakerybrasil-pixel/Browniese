"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select } from "@/components/ui/input";
import { addSupplyIngredient } from "@/app/(dashboard)/insumos/actions";
import { emptyActionState, type ActionState } from "@/lib/validation";
import type { RawMaterial } from "@/types";

const UNITS = ["g", "kg", "ml", "l", "un", "cx"] as const;

export function SupplyIngredientForm({
  supplyId,
  rawMaterials,
}: {
  supplyId: string;
  rawMaterials: RawMaterial[];
}) {
  const action = addSupplyIngredient.bind(null, supplyId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    emptyActionState(),
  );

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <Label htmlFor="raw_material_id">Matéria prima</Label>
        <Select id="raw_material_id" name="raw_material_id" required defaultValue="">
          <option value="" disabled>
            Selecione...
          </option>
          {rawMaterials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
        <FieldError message={state.fieldErrors?.raw_material_id?.[0]} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="ing_quantity">Quantidade</Label>
          <Input
            id="ing_quantity"
            name="quantity"
            inputMode="decimal"
            required
            placeholder="50"
          />
          <FieldError message={state.fieldErrors?.quantity?.[0]} />
        </div>
        <div>
          <Label htmlFor="ing_unit">Unidade</Label>
          <Select id="ing_unit" name="unit" defaultValue="g">
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {state.error && !state.fieldErrors ? (
        <p className="text-sm text-red-700">{state.error}</p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Adicionando..." : "Adicionar ingrediente"}
        </Button>
      </div>
    </form>
  );
}
