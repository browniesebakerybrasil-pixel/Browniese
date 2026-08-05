/**
 * Utilitários gerais do Brownie-se.
 *
 * Inclui:
 *  - cn(): classnames helper compatível com Tailwind (sem dependência externa)
 *  - formatCurrency / formatPercent / formatNumber
 *  - normalizeUnit / convertToBaseUnit (g, kg, ml, l, un, cx)
 *  - calcEffectiveCostPerUnit (custo efetivo de matéria prima com desperdício)
 *  - calcSheetCosts (CMV, markup, preço sugerido e mínimo da ficha técnica)
 *  - calcOrderTotals (líquido após taxa de canal)
 *
 * Todas as fórmulas estão comentadas com a regra de negócio que implementam.
 */

// ---------------------------------------------------------------------------
// Classnames
// ---------------------------------------------------------------------------

type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | Record<string, boolean | null | undefined>
  | ClassValue[];

/**
 * Combina classes de Tailwind condicionalmente. Versão leve (sem clsx/twMerge).
 * Para conflitos de Tailwind (ex.: `p-2 p-4`), prevalece a última declarada,
 * que é o comportamento natural do CSS — funciona bem para a maioria dos casos.
 */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === "string" || typeof input === "number") {
      out.push(String(input));
    } else if (Array.isArray(input)) {
      const inner = cn(...input);
      if (inner) out.push(inner);
    } else if (typeof input === "object") {
      for (const [key, value] of Object.entries(input)) {
        if (value) out.push(key);
      }
    }
  }
  return out.join(" ");
}

// ---------------------------------------------------------------------------
// Formatação (pt-BR)
// ---------------------------------------------------------------------------

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return BRL.format(value);
}

export function formatPercent(
  value: number | null | undefined,
  digits = 1,
): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits).replace(".", ",")}%`;
}

export function formatNumber(
  value: number | null | undefined,
  digits = 2,
): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

// ---------------------------------------------------------------------------
// Unidades de medida
// ---------------------------------------------------------------------------

export type Unit = "g" | "kg" | "ml" | "l" | "un" | "cx";

export const UNIT_LABEL: Record<Unit, string> = {
  g: "g",
  kg: "kg",
  ml: "ml",
  l: "l",
  un: "un",
  cx: "cx",
};

/** Unidades exibidas como "por 100 (g/ml)" no UI. */
const SMALL_UNITS: Unit[] = ["g", "ml"];

export function isSmallUnit(unit: Unit): boolean {
  return SMALL_UNITS.includes(unit);
}

/**
 * Retorna o custo formatado em escala apropriada para exibição:
 *  - g, ml  -> "R$ X / 100<unit>"
 *  - kg, l, un, cx -> "R$ X / <unit>"
 */
export function formatUnitCost(
  costPerUnit: number,
  unit: Unit,
): string {
  if (!Number.isFinite(costPerUnit)) return "—";
  if (isSmallUnit(unit)) {
    return `${formatCurrency(costPerUnit * 100)} / 100${unit}`;
  }
  return `${formatCurrency(costPerUnit)} / ${unit}`;
}

/**
 * Converte (qty, fromUnit) para a unidade-base do mesmo grupo:
 *  - massa: g
 *  - volume: ml
 *  - discreta: un, cx (sem conversão)
 *
 * Lança erro se as unidades não forem compatíveis. Útil ao somar custos de
 * insumos em uma ficha técnica onde o ingrediente está em kg mas a receita
 * pede em g.
 */
export function convertQuantity(
  qty: number,
  fromUnit: Unit,
  toUnit: Unit,
): number {
  if (fromUnit === toUnit) return qty;

  const massScale: Partial<Record<Unit, number>> = { g: 1, kg: 1000 };
  const volumeScale: Partial<Record<Unit, number>> = { ml: 1, l: 1000 };

  if (fromUnit in massScale && toUnit in massScale) {
    return (qty * massScale[fromUnit]!) / massScale[toUnit]!;
  }
  if (fromUnit in volumeScale && toUnit in volumeScale) {
    return (qty * volumeScale[fromUnit]!) / volumeScale[toUnit]!;
  }

  throw new Error(
    `Conversão inválida: ${fromUnit} -> ${toUnit}. Unidades incompatíveis.`,
  );
}

// ---------------------------------------------------------------------------
// Cálculos de negócio
// ---------------------------------------------------------------------------

/**
 * Custo efetivo por unidade de uma matéria prima, considerando desperdício.
 *
 *   custo_por_unidade  = custo_total / quantidade
 *   custo_efetivo      = custo_por_unidade * (1 + desperdicio_% / 100)
 *
 * Ex.: embalagem 1kg que custa R$ 50 com 5% de desperdício
 *   -> 0,05 * 1,05 = R$ 0,0525 / g
 */
export function calcEffectiveCostPerUnit(input: {
  totalCost: number;
  quantity: number;
  wastePercentage?: number;
}): number {
  const { totalCost, quantity, wastePercentage = 0 } = input;
  if (!quantity) return 0;
  const base = totalCost / quantity;
  return base * (1 + wastePercentage / 100);
}

/**
 * Cálculos consolidados de uma ficha técnica.
 *
 *   custo_total           = custo_ingredientes + Σ custos fixos
 *   cmv_por_unidade       = custo_total / rendimento
 *   cmv_percentual        = (cmv_por_unidade / preço_venda) * 100
 *   markup                = 1 / (1 - margem/100)
 *   preço_sugerido        = custo_total * markup
 *   preço_mínimo          = custo_total / (1 - margem/100)
 *
 * Observação: preço sugerido e preço mínimo são equivalentes algebricamente,
 * mantemos os dois para deixar explícito no UI quando a margem é tratada como
 * markup vs. margem-sobre-venda. O preço mínimo é o preço abaixo do qual a
 * margem desejada não é atingida.
 */
export function calcSheetCosts(input: {
  ingredientCost: number;
  gasCost?: number;
  energyCost?: number;
  packagingCost?: number;
  laborCost?: number;
  otherFixedCosts?: number;
  yieldQuantity: number;
  salePrice?: number;
  desiredMargin?: number;
}) {
  const {
    ingredientCost,
    gasCost = 0,
    energyCost = 0,
    packagingCost = 0,
    laborCost = 0,
    otherFixedCosts = 0,
    yieldQuantity,
    salePrice = 0,
    desiredMargin = 0,
  } = input;

  const fixedCost =
    gasCost + energyCost + packagingCost + laborCost + otherFixedCosts;
  const totalCost = ingredientCost + fixedCost;

  const safeYield = yieldQuantity > 0 ? yieldQuantity : 1;
  const costPerUnit = totalCost / safeYield;

  const cmvPercentage =
    salePrice > 0 ? (costPerUnit / salePrice) * 100 : 0;

  const marginFactor = 1 - desiredMargin / 100;
  const markup = marginFactor > 0 ? 1 / marginFactor : 0;
  const suggestedPrice = totalCost * markup;
  const minimumPrice = marginFactor > 0 ? totalCost / marginFactor : 0;

  return {
    fixedCost,
    totalCost,
    costPerUnit,
    cmvPercentage,
    markup,
    suggestedPrice,
    minimumPrice,
  };
}

/**
 * Cálculo de pedido com taxa de canal (iFood, Rappi etc.).
 *
 *   valor_bruto      = Σ (qtd * preço_unit)
 *   taxa_plataforma  = valor_bruto * (taxa% / 100)
 *   valor_liquido    = valor_bruto - taxa_plataforma
 */
export function calcOrderTotals(
  items: ReadonlyArray<{ quantity: number; unitPrice: number }>,
  channelFeePercentage = 0,
) {
  const grossAmount = items.reduce(
    (acc, it) => acc + it.quantity * it.unitPrice,
    0,
  );
  const platformFee = grossAmount * (channelFeePercentage / 100);
  const netAmount = grossAmount - platformFee;

  return { grossAmount, platformFee, netAmount };
}
