"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select } from "@/components/ui/input";
import { addSheetIngredient } from "@/app/(dashboard)/fichas-tecnicas/actions";
import { emptyActionState, type ActionState } from "@/lib/validation";
import type { RawMaterial, Supply } from "@/types";

const UNITS = ["g", "kg", "ml", "l", "un", "cx"] as const;

export function SheetIngredientForm({
  sheetId,
  rawMaterials,
  supplies,
}: {
  sheetId: string;
  rawMaterials: RawMaterial[];
  supplies: Supply[];
}) {
  const [type, setType] = useState<"raw_material" | "supply">("raw_material");
  const action = addSheetIngredient.bind(null, sheetId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    emptyActionState(),
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="ingredient_type" value={type} />

      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setType("raw_material")}
          className={`flex-1 rounded-md border px-3 py-2 ${
            type === "raw_material"
              ? "border-[var(--color-brown)] bg-[var(--color-cream-50)]"
              : "border-[var(--border)] bg-white"
          }`}
        >
          Matéria prima
        </button>
        <button
          type="button"
          onClick={() => setType("supply")}
          className={`flex-1 rounded-md border px-3 py-2 ${
            type === "supply"
              ? "border-[var(--color-brown)] bg-[var(--color-cream-50)]"
              : "border-[var(--border)] bg-white"
          }`}
        >
          Insumo
        </button>
      </div>

      {type === "raw_material" ? (
        <div>
          <Label htmlFor="rm_select">Matéria prima</Label>
          <Select
            id="rm_select"
            name="raw_material_id"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Selecione...
            </option>
            {rawMaterials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </div>
      ) : (
        <div>
          <Label htmlFor="supply_select">Insumo</Label>
          <Select id="supply_select" name="supply_id" required defaultValue="">
            <option value="" disabled>
              Selecione...
            </option>
            {supplies.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="ing_quantity">Quantidade</Label>
          <Input
            id="ing_quantity"
            name="quantity"
            inputMode="decimal"
            required
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
          {pending ? "..." : "Adicionar"}
        </Button>
      </div>
    </form>
  );
}
