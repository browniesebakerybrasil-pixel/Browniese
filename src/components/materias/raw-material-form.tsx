"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select } from "@/components/ui/input";
import {
  createRawMaterial,
  updateRawMaterial,
} from "@/app/(dashboard)/materias-primas/actions";
import { emptyActionState, type ActionState } from "@/lib/validation";
import {
  calcEffectiveCostPerUnit,
  formatCurrency,
  formatUnitCost,
  type Unit,
} from "@/lib/utils";
import type { RawMaterial } from "@/types";

const UNITS: Array<{ value: Unit; label: string }> = [
  { value: "g", label: "gramas (g)" },
  { value: "kg", label: "quilogramas (kg)" },
  { value: "ml", label: "mililitros (ml)" },
  { value: "l", label: "litros (l)" },
  { value: "un", label: "unidade (un)" },
  { value: "cx", label: "caixa (cx)" },
];

interface Props {
  mode: "create" | "edit";
  material?: RawMaterial;
}

/**
 * Converte um input em pt-BR (ex.: "1.234,56") em número. Espelha a lógica
 * do `numberFromInput` no `@/lib/validation` para manter o preview do custo
 * efetivo coerente com o cálculo do servidor.
 */
function parseDecimalInput(value: string): number {
  if (!value) return NaN;
  const cleaned = value.trim().replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

export function RawMaterialForm({ mode, material }: Props) {
  const action =
    mode === "create"
      ? createRawMaterial
      : updateRawMaterial.bind(null, material!.id);

  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    emptyActionState(),
  );

  const [quantity, setQuantity] = useState<string>(
    material?.quantity != null ? String(material.quantity) : "",
  );
  const [unit, setUnit] = useState<Unit>((material?.unit as Unit) ?? "g");
  const [totalCost, setTotalCost] = useState<string>(
    material?.total_cost != null ? String(material.total_cost) : "",
  );
  const [waste, setWaste] = useState<string>(
    material?.waste_percentage != null ? String(material.waste_percentage) : "0",
  );

  const preview = useMemo(() => {
    const q = parseDecimalInput(quantity);
    const c = parseDecimalInput(totalCost);
    const w = parseDecimalInput(waste);
    if (!Number.isFinite(q) || q <= 0) return null;
    if (!Number.isFinite(c) || c < 0) return null;
    const wastePercentage = Number.isFinite(w) && w >= 0 ? w : 0;
    const costPerUnit = calcEffectiveCostPerUnit({
      totalCost: c,
      quantity: q,
      wastePercentage,
    });
    return { costPerUnit, label: formatUnitCost(costPerUnit, unit) };
  }, [quantity, totalCost, waste, unit]);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={material?.name ?? ""}
          placeholder="Ex.: Carne moída 80/20"
        />
        <FieldError message={state.fieldErrors?.name?.[0]} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="quantity" hint="da embalagem">
            Quantidade
          </Label>
          <Input
            id="quantity"
            name="quantity"
            inputMode="decimal"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="1000"
          />
          <FieldError message={state.fieldErrors?.quantity?.[0]} />
        </div>
        <div>
          <Label htmlFor="unit">Unidade</Label>
          <Select
            id="unit"
            name="unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value as Unit)}
            required
          >
            {UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </Select>
          <FieldError message={state.fieldErrors?.unit?.[0]} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="total_cost" hint="R$">
            Custo total
          </Label>
          <Input
            id="total_cost"
            name="total_cost"
            inputMode="decimal"
            required
            value={totalCost}
            onChange={(e) => setTotalCost(e.target.value)}
            placeholder="49,90"
          />
          <FieldError message={state.fieldErrors?.total_cost?.[0]} />
        </div>
        <div>
          <Label htmlFor="waste_percentage" hint="% perda">
            Desperdício
          </Label>
          <Input
            id="waste_percentage"
            name="waste_percentage"
            inputMode="decimal"
            value={waste}
            onChange={(e) => setWaste(e.target.value)}
            placeholder="0"
          />
          <FieldError message={state.fieldErrors?.waste_percentage?.[0]} />
        </div>
      </div>

      {preview ? (
        <div className="rounded-md bg-[var(--color-cream-50)] p-3 text-sm">
          <p className="text-xs uppercase tracking-widest text-[var(--color-slate)]">
            Custo efetivo
          </p>
          <p className="mt-1 font-serif text-xl text-[var(--color-navy)]">
            {preview.label}
          </p>
          <p className="mt-1 text-xs text-[var(--color-slate)]">
            Equivale a {formatCurrency(preview.costPerUnit)} por {unit} já com
            o desperdício aplicado.
          </p>
        </div>
      ) : null}

      {state.error && !state.fieldErrors ? (
        <p className="text-sm text-red-700">{state.error}</p>
      ) : null}

      {state.ok && mode === "edit" ? (
        <p className="text-sm text-emerald-700">
          Salvo. Insumos e fichas que usam esta matéria foram recalculados.
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : mode === "create" ? "Criar" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
