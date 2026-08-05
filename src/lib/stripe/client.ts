import Stripe from "stripe";

/**
 * Cliente Stripe (server-side).
 *
 * Inicialização preguiçosa: o SDK só é instanciado na primeira propriedade
 * acessada. Isso evita que módulos puramente client-side que tocam neste
 * arquivo apenas para ler `PLAN_LABEL` quebrem quando `STRIPE_SECRET_KEY`
 * não está configurado em dev/local.
 */
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY não configurado. Defina no .env.local antes de chamar Stripe.",
    );
  }
  _stripe = new Stripe(key, {
    typescript: true,
    appInfo: { name: "Brownie-se", version: "0.1.0" },
  });
  return _stripe;
}

export const STRIPE_PRICES = {
  basico: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASICO ?? "",
  full: process.env.NEXT_PUBLIC_STRIPE_PRICE_FULL ?? "",
  master: process.env.NEXT_PUBLIC_STRIPE_PRICE_MASTER ?? "",
} as const;

export type PlanKey = keyof typeof STRIPE_PRICES;

export const PLAN_LABEL: Record<PlanKey, string> = {
  basico: "Básico",
  full: "Full",
  master: "Master",
};

export const PLAN_PRICE_BRL: Record<PlanKey, number> = {
  basico: 97,
  full: 147,
  master: 247,
};
