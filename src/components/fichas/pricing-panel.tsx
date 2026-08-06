import { formatCurrency, formatPercent } from "@/lib/utils";
import type { PricingTier } from "@/types";

/**
 * Painel de leitura mostrando todos os tiers cadastrados na ficha.
 * Para cada tier: preço praticado, margem alvo, margem real (com base no
 * custo unitário atual) e se está abaixo do mínimo absoluto.
 *
 * Server component: apenas leitura, sem estado.
 */
export function PricingPanel({
  tiers,
  costPerUnit,
  absoluteMinPrice,
}: {
  tiers: PricingTier[];
  costPerUnit: number;
  absoluteMinPrice: number | null;
}) {
  if (!tiers || tiers.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-white p-5">
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="font-serif text-lg text-[var(--color-navy)]">
          Preços por canal
        </h3>
        {absoluteMinPrice != null && absoluteMinPrice > 0 ? (
          <p className="text-xs text-[var(--color-slate)]">
            Mínimo absoluto:{" "}
            <span className="font-mono text-red-700">
              {formatCurrency(absoluteMinPrice)}
            </span>
          </p>
        ) : null}
      </header>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-widest text-[var(--color-slate)]">
              <th className="py-2 pr-4">Canal</th>
              <th className="px-2">Margem alvo</th>
              <th className="px-2">Preço mín. (calc.)</th>
              <th className="px-2">Preço praticado</th>
              <th className="px-2">Margem real</th>
              <th className="px-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((t, idx) => {
              const price = Number(t.price);
              const marginTarget = Number(t.target_margin);
              const marginFactor = 1 - marginTarget / 100;
              const minPrice = marginFactor > 0 ? costPerUnit / marginFactor : 0;
              const realMargin =
                price > 0 ? ((price - costPerUnit) / price) * 100 : 0;
              const belowAbsolute =
                absoluteMinPrice != null &&
                absoluteMinPrice > 0 &&
                price > 0 &&
                price < absoluteMinPrice;
              const belowTarget = price > 0 && price < minPrice;

              return (
                <tr
                  key={idx}
                  className="border-b border-[var(--border)] last:border-0"
                >
                  <td className="py-3 pr-4 font-medium text-[var(--color-navy)]">
                    {t.label}
                  </td>
                  <td className="px-2 font-mono text-[var(--color-slate)]">
                    {formatPercent(marginTarget, 0)}
                  </td>
                  <td className="px-2 font-mono text-[var(--color-slate)]">
                    {costPerUnit > 0 ? formatCurrency(minPrice) : "—"}
                  </td>
                  <td className="px-2 font-mono text-[var(--color-navy)]">
                    {price > 0 ? formatCurrency(price) : "—"}
                  </td>
                  <td
                    className={
                      "px-2 font-mono " +
                      (belowAbsolute
                        ? "text-red-700"
                        : belowTarget
                          ? "text-amber-700"
                          : "text-emerald-800")
                    }
                  >
                    {price > 0 ? formatPercent(realMargin, 1) : "—"}
                  </td>
                  <td className="px-2 text-right">
                    {price === 0 ? (
                      <span className="text-xs text-[var(--color-slate)]">
                        sem preço
                      </span>
                    ) : belowAbsolute ? (
                      <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                        abaixo do mínimo
                      </span>
                    ) : belowTarget ? (
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        abaixo da meta
                      </span>
                    ) : (
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                        ok
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
