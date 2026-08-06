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
import type { PackagingItem, PricingTier, TechnicalSheet } from "@/types";

interface TierRow {
  key: string;
  label: string;
  target_margin: string;
  price: string;
}

const DEFAULT_TIERS: PricingTier[] = [
  { key: "varejo", label: "Varejo", target_margin: 60, price: 0 },
  { key: "atacado", label: "Atacado", target_margin: 30, price: 0 },
  { key: "revenda", label: "Revenda", target_margin: 40, price: 0 },
  { key: "eventos", label: "Eventos", target_margin: 50, price: 0 },
  { key: "casamentos", label: "Casamentos", target_margin: 80, price: 0 },
];

function initialTierRows(sheet?: TechnicalSheet): TierRow[] {
  const tiers = sheet?.pricing_tiers;
  if (tiers && tiers.length > 0) {
    return tiers.map((t) => ({
      key: t.key,
      label: t.label,
      target_margin: String(Number(t.target_margin)).replace(".", ","),
      price: String(Number(t.price)).replace(".", ","),
    }));
  }
  // Fichas antigas: pre-preenche o Varejo com sale_price/desired_margin
  // legados, mantem os outros com valores padrao.
  return DEFAULT_TIERS.map((t) => {
    if (t.key === "varejo" && sheet) {
      return {
        key: t.key,
        label: t.label,
        target_margin: String(Number(sheet.desired_margin ?? t.target_margin)).replace(
          ".",
          ",",
        ),
        price: String(Number(sheet.sale_price ?? 0)).replace(".", ","),
      };
    }
    return {
      key: t.key,
      label: t.label,
      target_margin: String(t.target_margin),
      price: "",
    };
  });
}

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

  const [tiers, setTiers] = useState<TierRow[]>(() => initialTierRows(sheet));

  // Custo total unitário — usado pra calcular preço mínimo por tier.
  // Se ficha ainda nao foi salva, cai pra 0 (a pagina de detalhe calcula certo
  // depois; aqui é so visualização enquanto edita).
  const costPerUnit = Number(sheet?.cost_per_unit ?? 0);

  const tiersJson = useMemo(
    () =>
      JSON.stringify(
        tiers
          .filter((t) => t.label.trim().length > 0)
          .map((t) => ({
            key: t.key,
            label: t.label.trim(),
            target_margin: parseCost(t.target_margin),
            price: parseCost(t.price),
          })),
      ),
    [tiers],
  );

  function updateTier(idx: number, key: keyof TierRow, value: string) {
    setTiers((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)),
    );
  }

  function minPriceForMargin(marginStr: string): number {
    const margin = parseCost(marginStr);
    if (margin >= 100) return 0;
    const factor = 1 - margin / 100;
    return factor > 0 ? costPerUnit / factor : 0;
  }

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

      {/* -----------------------------------------------------------------
           Estratégia comercial (migration 006)
           Cada linha = um canal (varejo, atacado, revenda, eventos, casamento).
           Usuario define margem alvo e preço praticado. O sistema mostra o
           preço mínimo pra bater a margem (readonly).
           A ficha antiga usava sale_price/desired_margin — o "Varejo" preserva
           esses valores como default.
      ----------------------------------------------------------------- */}
      <fieldset className="rounded-md border border-[var(--border)] p-4">
        <legend className="px-2 text-xs uppercase tracking-widest text-[var(--color-slate)]">
          Estratégia comercial
        </legend>
        <p className="mt-1 px-2 text-xs text-[var(--color-slate)]">
          Preço por canal + margem alvo. O sistema mostra o preço mínimo pra
          bater a margem que você quer. Você pode praticar acima disso.
        </p>

        {/* Cada tier é um card com hierarquia clara:
             1) Nome do canal como título grande (input estilizado)
             2) Divisor
             3) Margem alvo + preço praticado lado a lado
             4) Rodapé com preço mínimo calculado + botão remover
             Bg cream + border marrom escuro dão contraste entre blocos. */}
        <div className="mt-3 space-y-4">
          {tiers.map((t, idx) => {
            const minPrice = minPriceForMargin(t.target_margin);
            return (
              <div
                key={idx}
                className="overflow-hidden rounded-lg border-2 border-[var(--color-navy)]/10 bg-white shadow-sm"
              >
                {/* Header do tier — nome do canal em destaque */}
                <div className="border-b border-[var(--border)] bg-[var(--color-cream-50)] px-4 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--color-slate)]">
                    Canal
                  </p>
                  <input
                    type="text"
                    placeholder="Nome (ex.: Varejo)"
                    value={t.label}
                    onChange={(e) => updateTier(idx, "label", e.target.value)}
                    className="mt-0.5 w-full border-0 bg-transparent p-0 font-serif text-lg text-[var(--color-navy)] outline-none placeholder:text-[var(--color-slate)]/60 focus:outline-none"
                  />
                </div>

                {/* Corpo do tier — margem + preço */}
                <div className="grid grid-cols-2 gap-3 p-4">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--color-slate)]">
                      Margem alvo %
                    </p>
                    <Input
                      placeholder="60"
                      inputMode="decimal"
                      value={t.target_margin}
                      onChange={(e) =>
                        updateTier(idx, "target_margin", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--color-slate)]">
                      Preço praticado
                    </p>
                    <Input
                      placeholder="R$ 0,00"
                      inputMode="decimal"
                      value={t.price}
                      onChange={(e) => updateTier(idx, "price", e.target.value)}
                    />
                  </div>
                </div>

                {/* Rodapé do tier — preço mínimo + remover */}
                <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--color-cream-50)] px-4 py-2 text-xs">
                  <span className="text-[var(--color-slate)]">
                    Preço mínimo pra bater a margem:{" "}
                    <span className="font-mono font-semibold text-[var(--color-navy)]">
                      {costPerUnit > 0 ? formatCurrency(minPrice) : "—"}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={tiers.length === 1}
                    onClick={() =>
                      setTiers((prev) => prev.filter((_, i) => i !== idx))
                    }
                  >
                    Remover
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              setTiers((prev) => [
                ...prev,
                {
                  key: `custom_${prev.length}`,
                  label: "",
                  target_margin: "50",
                  price: "",
                },
              ])
            }
          >
            + Canal
          </Button>
        </div>

        <div className="mt-4 grid gap-3 rounded-md bg-[var(--color-cream-50)] p-3 md:grid-cols-[1fr_180px] md:items-center">
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--color-slate)]">
              Preço mínimo absoluto
            </p>
            <p className="text-xs text-[var(--color-slate)]">
              O chão da negociação — abaixo disso o sistema alerta em vermelho.
            </p>
          </div>
          <Input
            name="absolute_min_price"
            inputMode="decimal"
            defaultValue={
              sheet?.absolute_min_price != null
                ? String(sheet.absolute_min_price).replace(".", ",")
                : ""
            }
            placeholder="R$ 0,00"
          />
        </div>

        {/* Hidden inputs para o server action */}
        <input type="hidden" name="pricing_tiers" value={tiersJson} />
        {/* sale_price e desired_margin são sincronizados no server com o tier
            "varejo" — mandamos 0 pra o schema aceitar, o server sobrescreve. */}
        <input type="hidden" name="sale_price" value="0" />
        <input type="hidden" name="desired_margin" value="0" />
      </fieldset>

      <fieldset className="rounded-md border border-[var(--border)] p-4">
        <legend className="px-2 text-xs uppercase tracking-widest text-[var(--color-slate)]">
          Custo fixo / produção (por ficha)
        </legend>
        <p className="mt-1 px-2 text-xs text-[var(--color-slate)]">
          Um único valor que representa gás, energia, mão de obra e outros
          gastos rateados por ficha. Ex.: R$ 2,00.
        </p>
        <div className="mt-3">
          <Label htmlFor="other_fixed_costs" hint="R$">
            Custo fixo total
          </Label>
          <Input
            id="other_fixed_costs"
            name="other_fixed_costs"
            inputMode="decimal"
            defaultValue={String(
              Number(sheet?.gas_cost ?? 0) +
                Number(sheet?.energy_cost ?? 0) +
                Number(sheet?.labor_cost ?? 0) +
                Number(sheet?.other_fixed_costs ?? 0),
            )}
            placeholder="2,00"
          />
          {/* Zera os campos legados no submit — o total vai só em other_fixed_costs. */}
          <input type="hidden" name="gas_cost" value="0" />
          <input type="hidden" name="energy_cost" value="0" />
          <input type="hidden" name="labor_cost" value="0" />
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

          <div className="mt-3 space-y-3">
            {rows.map((row, idx) => (
              <div
                key={idx}
                className="space-y-2 rounded-md border border-[var(--border)] bg-white p-3"
              >
                <Input
                  placeholder="Nome (ex.: Caixinha, Sacolinha)"
                  value={row.name}
                  onChange={(e) => updateRow(idx, "name", e.target.value)}
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="R$ 0,00"
                    inputMode="decimal"
                    value={row.cost}
                    onChange={(e) => updateRow(idx, "cost", e.target.value)}
                    className="flex-1"
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
