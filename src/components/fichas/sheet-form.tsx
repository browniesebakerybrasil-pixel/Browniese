"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  FieldError,
  Input,
  Label,
  Textarea,
} from "@/components/ui/input";
import {
  createTechnicalSheet,
  updateTechnicalSheet,
} from "@/app/(dashboard)/fichas-tecnicas/actions";
import { emptyActionState, type ActionState } from "@/lib/validation";
import type { TechnicalSheet } from "@/types";

export function SheetForm({
  mode,
  sheet,
}: {
  mode: "create" | "edit";
  sheet?: TechnicalSheet;
}) {
  const action =
    mode === "create"
      ? createTechnicalSheet
      : updateTechnicalSheet.bind(null, sheet!.id);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    emptyActionState(),
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="name">Nome do produto</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={sheet?.name ?? ""}
            placeholder="Ex.: X-Búrguer da Casa"
          />
          <FieldError message={state.fieldErrors?.name?.[0]} />
        </div>
        <div>
          <Label htmlFor="category">Categoria</Label>
          <Input
            id="category"
            name="category"
            defaultValue={sheet?.category ?? ""}
            placeholder="Hambúrguer / Bebida / Sobremesa"
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <Label htmlFor="yield_quantity" hint="rendimento">
            Rende
          </Label>
          <Input
            id="yield_quantity"
            name="yield_quantity"
            inputMode="decimal"
            defaultValue={String(sheet?.yield_quantity ?? 1)}
          />
        </div>
        <div>
          <Label htmlFor="yield_unit">Unidade</Label>
          <Input
            id="yield_unit"
            name="yield_unit"
            defaultValue={sheet?.yield_unit ?? "unidades"}
          />
        </div>
        <div>
          <Label htmlFor="prep_time_minutes" hint="min">
            Tempo de preparo
          </Label>
          <Input
            id="prep_time_minutes"
            name="prep_time_minutes"
            inputMode="numeric"
            defaultValue={
              sheet?.prep_time_minutes != null
                ? String(sheet.prep_time_minutes)
                : ""
            }
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="sale_price" hint="R$">
            Preço de venda atual
          </Label>
          <Input
            id="sale_price"
            name="sale_price"
            inputMode="decimal"
            defaultValue={String(sheet?.sale_price ?? "")}
            placeholder="29,90"
          />
        </div>
        <div>
          <Label htmlFor="desired_margin" hint="margem alvo (%)">
            Margem desejada
          </Label>
          <Input
            id="desired_margin"
            name="desired_margin"
            inputMode="decimal"
            defaultValue={String(sheet?.desired_margin ?? 60)}
            placeholder="60"
          />
        </div>
      </div>

      <fieldset className="rounded-md border border-[var(--border)] p-4">
        <legend className="px-2 text-xs uppercase tracking-widest text-[var(--color-slate)]">
          Custos fixos rateados (por ficha)
        </legend>
        <div className="mt-2 grid gap-3 md:grid-cols-3">
          <div>
            <Label htmlFor="gas_cost">Gás</Label>
            <Input
              id="gas_cost"
              name="gas_cost"
              inputMode="decimal"
              defaultValue={String(sheet?.gas_cost ?? 0)}
            />
          </div>
          <div>
            <Label htmlFor="energy_cost">Energia</Label>
            <Input
              id="energy_cost"
              name="energy_cost"
              inputMode="decimal"
              defaultValue={String(sheet?.energy_cost ?? 0)}
            />
          </div>
          <div>
            <Label htmlFor="packaging_cost">Embalagem</Label>
            <Input
              id="packaging_cost"
              name="packaging_cost"
              inputMode="decimal"
              defaultValue={String(sheet?.packaging_cost ?? 0)}
            />
          </div>
          <div>
            <Label htmlFor="labor_cost">Mão de obra</Label>
            <Input
              id="labor_cost"
              name="labor_cost"
              inputMode="decimal"
              defaultValue={String(sheet?.labor_cost ?? 0)}
            />
          </div>
          <div>
            <Label htmlFor="other_fixed_costs">Outros</Label>
            <Input
              id="other_fixed_costs"
              name="other_fixed_costs"
              inputMode="decimal"
              defaultValue={String(sheet?.other_fixed_costs ?? 0)}
            />
          </div>
        </div>
      </fieldset>

      <div>
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" name="notes" defaultValue={sheet?.notes ?? ""} />
      </div>

      {state.error && !state.fieldErrors ? (
        <p className="text-sm text-red-700">{state.error}</p>
      ) : null}

      {state.ok && mode === "edit" ? (
        <p className="text-sm text-emerald-700">
          Ficha atualizada e CMV recalculado.
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : mode === "create" ? "Criar" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
