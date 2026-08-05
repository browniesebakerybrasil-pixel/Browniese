"use client";

import { useActionState, useMemo, useState } from "react";
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
import { formatCurrency } from "@/lib/utils";
import type { PackagingItem, TechnicalSheet } from "@/types";

interface PackagingRow {
  name: string;
  cost: string; // string pra permitir input livre "1,50"
}

/**
 * Estado inicial da lista de embalagens.
 *  - Se a ficha ja tem packaging_items, usa eles.
 *  - Se nao tem itens mas tem packaging_cost legado > 0, cria 1 linha
 *    "Embalagem" com o valor.
 *  - Caso contrario, uma linha em branco.
 */
function initialPackagingRows(sheet?: TechnicalSheet): PackagingRow[] {
  const items = sheet?.packaging_items;
  if (items && items.length > 0) {
    return items.map((it) => ({
      name: it.name,
      cost: String(Number(it.cost)).replace(".", ","),
    }));
  }
  const legacy = Number(sheet?.packaging_cost ?? 0);
  if (legacy > 0) {
    return [
      { name: "Embalagem", cost: String(legacy).replace(".", ",") },
    ];
  }
  return [{ name: "", cost: "" }];
}

function parseCost(v: string): number {
  if (!v) return 0;
  const cleaned = v.trim().replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

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

  const [rows, setRows] = useState<PackagingRow[]>(() =>
    initialPackagingRows(sheet),
  );

  const packagingTotal = useMemo(
    () => rows.reduce((acc, r) => acc + parseCost(r.cost), 0),
    [rows],
  );

  // Serializa a lista pra um campo hidden que o server action le como JSON.
  // Filtra linhas com nome vazio (usuario ainda esta digitando).
  const packagingJson = useMemo<string>(() => {
    const cleaned: PackagingItem[] = rows
      .map((r) => ({ name: r.name.trim(), cost: parseCost(r.cost) }))
      .filter((r) => r.name.length > 0);
    return JSON.stringify(cleaned);
  }, [rows]);

  function updateRow(idx: number, key: keyof PackagingRow, value: string) {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)),
    );
  }

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
        <div className="mt-2 grid gap-3 md:grid-cols-2">
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

        {/* ------------------------------------------------------------------
             Embalagens — lista repetivel. Cada linha tem nome + custo.
             O total substitui o campo packaging_cost automaticamente na
             server action. Ideal pra brownie com caixinha + sacolinha, ou
             pizza com caixa + guardanapo etc.
        ------------------------------------------------------------------ */}
        <div className="mt-5 border-t border-[var(--border)] pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[var(--color-navy)]">
              Embalagens
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setRows((prev) => [...prev, { name: "", cost: "" }])
              }
            >
              + Adicionar
            </Button>
          </div>
          <p className="mt-1 text-xs text-[var(--color-slate)]">
            Ex.: Caixinha, Sacolinha, Guardanapo. O total soma sozinho.
          </p>

          <div className="mt-3 space-y-2">
            {rows.map((row, idx) => (
              <div
                key={idx}
                className="grid gap-2 rounded-md border border-[var(--border)] bg-white p-2 md:grid-cols-[1fr_140px_auto]"
              >
                <Input
                  placeholder="Nome (ex.: Caixinha)"
                  value={row.name}
                  onChange={(e) => updateRow(idx, "name", e.target.value)}
                />
                <Input
                  placeholder="R$ 0,00"
                  inputMode="decimal"
                  value={row.cost}
                  onChange={(e) => updateRow(idx, "cost", e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={rows.length === 1}
                  onClick={() =>
                    setRows((prev) => prev.filter((_, i) => i !== idx))
                  }
                >
                  Remover
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between rounded-md bg-[var(--color-cream-50)] px-3 py-2">
            <span className="text-xs uppercase tracking-widest text-[var(--color-slate)]">
              Total embalagem
            </span>
            <span className="font-serif text-lg text-[var(--color-navy)]">
              {formatCurrency(packagingTotal)}
            </span>
          </div>

          {/* Hidden inputs: JSON de itens + total (para o schema Zod) */}
          <input
            type="hidden"
            name="packaging_items"
            value={packagingJson}
          />
          <input
            type="hidden"
            name="packaging_cost"
            value={String(packagingTotal)}
          />
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
