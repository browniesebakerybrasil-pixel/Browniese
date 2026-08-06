"use client";

import { useMemo, useState } from "react";
import { Input, Label } from "@/components/ui/input";
import { formatCurrency, formatPercent } from "@/lib/utils";

/**
 * Simulador de negociação — 100% client-side, zero salvamento.
 *
 * Entrada: quantidade + preço unitário
 * Saída:   receita total, custo total, lucro bruto, margem real
 *
 * Se houver `absoluteMinPrice` e o preço unitário informado estiver abaixo,
 * mostra alerta vermelho.
 */
export function NegotiationSimulator({
  costPerUnit,
  absoluteMinPrice,
  defaultUnitPrice,
}: {
  costPerUnit: number;
  absoluteMinPrice: number | null;
  defaultUnitPrice: number;
}) {
  const [qtyStr, setQtyStr] = useState<string>("100");
  const [priceStr, setPriceStr] = useState<string>(
    defaultUnitPrice > 0
      ? String(defaultUnitPrice).replace(".", ",")
      : "",
  );

  const { qty, unitPrice, revenue, cost, profit, margin, belowAbsolute } =
    useMemo(() => {
      const q = parseDecimal(qtyStr);
      const p = parseDecimal(priceStr);
      const rev = q * p;
      const c = q * costPerUnit;
      const pr = rev - c;
      const m = rev > 0 ? (pr / rev) * 100 : 0;
      const below =
        absoluteMinPrice != null && absoluteMinPrice > 0 && p > 0 && p < absoluteMinPrice;
      return {
        qty: q,
        unitPrice: p,
        revenue: rev,
        cost: c,
        profit: pr,
        margin: m,
        belowAbsolute: below,
      };
    }, [qtyStr, priceStr, costPerUnit, absoluteMinPrice]);

  return (
    <section className="rounded-lg border border-[var(--border)] bg-white p-5">
      <header>
        <h3 className="font-serif text-lg text-[var(--color-navy)]">
          Simulador de negociação
        </h3>
        <p className="mt-1 text-xs text-[var(--color-slate)]">
          Teste um cenário em segundos. Nada aqui é salvo — só pra visualizar.
        </p>
      </header>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="sim_qty">Quantidade</Label>
          <Input
            id="sim_qty"
            inputMode="numeric"
            value={qtyStr}
            onChange={(e) => setQtyStr(e.target.value)}
            placeholder="100"
          />
        </div>
        <div>
          <Label htmlFor="sim_price" hint="R$">
            Preço unitário
          </Label>
          <Input
            id="sim_price"
            inputMode="decimal"
            value={priceStr}
            onChange={(e) => setPriceStr(e.target.value)}
            placeholder="5,00"
          />
        </div>
      </div>

      {belowAbsolute ? (
        <p className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          Preço unitário ({formatCurrency(unitPrice)}) abaixo do mínimo
          absoluto ({formatCurrency(absoluteMinPrice ?? 0)}). Não deve ser
          negociado.
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SimStat label="Receita total" value={formatCurrency(revenue)} />
        <SimStat label="Custo total" value={formatCurrency(cost)} />
        <SimStat
          label="Lucro bruto"
          value={formatCurrency(profit)}
          tone={profit > 0 ? "good" : profit < 0 ? "danger" : "default"}
        />
        <SimStat
          label="Margem"
          value={qty > 0 && unitPrice > 0 ? formatPercent(margin, 1) : "—"}
          tone={margin >= 30 ? "good" : margin >= 15 ? "warn" : "danger"}
        />
      </div>
    </section>
  );
}

function SimStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "good" | "warn" | "danger";
}) {
  const color =
    tone === "good"
      ? "text-emerald-800"
      : tone === "danger"
        ? "text-red-800"
        : tone === "warn"
          ? "text-amber-800"
          : "text-[var(--color-navy)]";
  return (
    <div className="rounded-md border border-[var(--border)] p-3">
      <p className="text-xs uppercase tracking-widest text-[var(--color-slate)]">
        {label}
      </p>
      <p className={`mt-1 font-serif text-xl ${color}`}>{value}</p>
    </div>
  );
}

function parseDecimal(v: string): number {
  if (!v) return 0;
  const cleaned = v.trim().replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}
