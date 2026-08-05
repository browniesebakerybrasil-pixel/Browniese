/**
 * Testes unitarios das funcoes de calculo. Usa o test runner nativo do Node
 * (`node --test`) para evitar adicionar Jest como dependencia.
 *
 * Rodar: `node --test --import tsx/esm src/lib/__tests__/utils.test.ts`
 * (necessario tsx). Alternativa: `npx tsx --test src/lib/__tests__/utils.test.ts`.
 *
 * Em CI / npm script, configurar:
 *   "test": "node --test --import tsx/esm 'src/lib/__tests__/**\/*.test.ts'"
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calcEffectiveCostPerUnit,
  calcSheetCosts,
  calcOrderTotals,
  convertQuantity,
  isSmallUnit,
  formatUnitCost,
} from "@/lib/utils";

test("calcEffectiveCostPerUnit: caso base sem desperdicio", () => {
  const cost = calcEffectiveCostPerUnit({
    totalCost: 50,
    quantity: 1000,
    wastePercentage: 0,
  });
  assert.equal(cost, 0.05);
});

test("calcEffectiveCostPerUnit: aplica desperdicio percentual", () => {
  const cost = calcEffectiveCostPerUnit({
    totalCost: 50,
    quantity: 1000,
    wastePercentage: 5,
  });
  assert.ok(Math.abs(cost - 0.0525) < 1e-9, `expected ~0.0525, got ${cost}`);
});

test("calcEffectiveCostPerUnit: quantidade zero retorna 0", () => {
  const cost = calcEffectiveCostPerUnit({
    totalCost: 50,
    quantity: 0,
  });
  assert.equal(cost, 0);
});

test("convertQuantity: g <-> kg", () => {
  assert.equal(convertQuantity(1, "kg", "g"), 1000);
  assert.equal(convertQuantity(500, "g", "kg"), 0.5);
});

test("convertQuantity: ml <-> l", () => {
  assert.equal(convertQuantity(2, "l", "ml"), 2000);
  assert.equal(convertQuantity(250, "ml", "l"), 0.25);
});

test("convertQuantity: erra ao misturar massa com volume", () => {
  assert.throws(() => convertQuantity(1, "g", "ml"));
});

test("convertQuantity: unidades discretas precisam ser iguais", () => {
  assert.equal(convertQuantity(3, "un", "un"), 3);
  assert.throws(() => convertQuantity(3, "un", "cx"));
});

test("isSmallUnit", () => {
  assert.equal(isSmallUnit("g"), true);
  assert.equal(isSmallUnit("ml"), true);
  assert.equal(isSmallUnit("kg"), false);
  assert.equal(isSmallUnit("un"), false);
});

test("formatUnitCost: g exibe por 100g", () => {
  // 0,05 R$/g => 5 R$/100g
  const out = formatUnitCost(0.05, "g");
  assert.match(out, /5,00.*100g/);
});

test("calcSheetCosts: cmv, markup e preco sugerido", () => {
  const r = calcSheetCosts({
    ingredientCost: 10,
    gasCost: 0.5,
    energyCost: 0.5,
    packagingCost: 1,
    laborCost: 2,
    otherFixedCosts: 0,
    yieldQuantity: 1,
    salePrice: 30,
    desiredMargin: 60, // markup = 1/(1-0.6) = 2.5
  });
  assert.equal(r.fixedCost, 4);
  assert.equal(r.totalCost, 14);
  assert.equal(r.costPerUnit, 14);
  // CMV = 14/30 ~ 46.66...
  assert.ok(Math.abs(r.cmvPercentage - 46.6667) < 0.01);
  assert.ok(Math.abs(r.markup - 2.5) < 1e-9);
  assert.equal(r.suggestedPrice, 35);
  assert.equal(r.minimumPrice, 35);
});

test("calcSheetCosts: sale_price=0 nao quebra", () => {
  const r = calcSheetCosts({
    ingredientCost: 10,
    yieldQuantity: 2,
    salePrice: 0,
    desiredMargin: 50,
  });
  assert.equal(r.totalCost, 10);
  assert.equal(r.costPerUnit, 5);
  assert.equal(r.cmvPercentage, 0);
  assert.equal(r.markup, 2);
  assert.equal(r.suggestedPrice, 20);
});

test("calcOrderTotals: liquido apos taxa", () => {
  const r = calcOrderTotals(
    [
      { quantity: 2, unitPrice: 30 },
      { quantity: 1, unitPrice: 15 },
    ],
    23, // iFood
  );
  assert.equal(r.grossAmount, 75);
  assert.ok(Math.abs(r.platformFee - 17.25) < 1e-9);
  assert.ok(Math.abs(r.netAmount - 57.75) < 1e-9);
});

test("calcOrderTotals: taxa zero -> liquido = bruto", () => {
  const r = calcOrderTotals([{ quantity: 1, unitPrice: 50 }], 0);
  assert.equal(r.netAmount, 50);
});
