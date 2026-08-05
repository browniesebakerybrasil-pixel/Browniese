import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calcEffectiveCostPerUnit,
  calcSheetCosts,
  convertQuantity,
  type Unit,
} from "@/lib/utils";

/**
 * Servico de recalculo em cascata.
 *
 * Estado do mundo:
 *   - raw_materials.cost_per_unit e effective_cost_per_unit sao GENERATED
 *     (Postgres calcula).
 *   - supplies.cost_per_unit e supplies.total_cost sao calculados aqui e
 *     persistidos em cada save.
 *   - technical_sheets.{ingredient_cost,total_cost,cost_per_unit,cmv_percentage,
 *     markup,suggested_price,minimum_price} idem.
 *
 * Por que recalcular no app e nao em triggers?
 *   - Conversao de unidade (g <-> kg, ml <-> l) e legivel.
 *   - Markup com `desired_margin` >= 100 deve ser tratado em codigo.
 *   - Tracar logs e mais simples.
 *
 * Uso:
 *   - apos save de raw_material -> recalculateForRawMaterials([id])
 *   - apos save de supply       -> recalculateSupply(id) + recalculateForSupplies([id])
 *   - apos save de sheet        -> recalculateSheet(id)
 */

type Client = SupabaseClient;

interface RawMaterialRow {
  id: string;
  unit: Unit;
  total_cost: number;
  quantity: number;
  waste_percentage: number;
  effective_cost_per_unit: number; // GENERATED, mas pode estar com lag de cache
}

interface SupplyRow {
  id: string;
  yield_quantity: number;
  yield_unit: Unit;
}

/**
 * Calcula o custo de um ingrediente quando a quantidade pode estar em uma
 * unidade diferente da matéria prima. Faz a conversao para a unidade-base e
 * multiplica pelo `effective_cost_per_unit` da matéria.
 */
function ingredientCost(
  ingredientQty: number,
  ingredientUnit: Unit,
  rawMaterial: Pick<RawMaterialRow, "unit" | "effective_cost_per_unit">,
): number {
  const qtyInRmUnit = convertQuantity(
    ingredientQty,
    ingredientUnit,
    rawMaterial.unit,
  );
  return qtyInRmUnit * Number(rawMaterial.effective_cost_per_unit ?? 0);
}

// ---------------------------------------------------------------------------
// Recalcula um insumo (supply)
// ---------------------------------------------------------------------------

export async function recalculateSupply(
  supabase: Client,
  supplyId: string,
): Promise<void> {
  const { data: supply, error } = await supabase
    .from("supplies")
    .select("id, yield_quantity, yield_unit")
    .eq("id", supplyId)
    .single();
  if (error || !supply) {
    if (error) console.error("[recalculateSupply] supply", error);
    return;
  }

  const { data: ingredients, error: ingErr } = await supabase
    .from("supply_ingredients")
    .select("quantity, unit, raw_material:raw_materials(*)")
    .eq("supply_id", supplyId);
  if (ingErr) {
    console.error("[recalculateSupply] ingredients", ingErr);
    return;
  }

  let total = 0;
  for (const ing of ingredients ?? []) {
    // raw_material vem como objeto pelo embed do PostgREST
    const rm = (ing as unknown as { raw_material: RawMaterialRow | null })
      .raw_material;
    if (!rm) continue;
    try {
      total += ingredientCost(Number(ing.quantity), ing.unit as Unit, rm);
    } catch (e) {
      // unidade incompativel — ignora ingrediente especifico
      console.warn("[recalculateSupply] skip ingredient", e);
    }
  }

  const yieldQty = Number(supply.yield_quantity) || 1;
  const costPerUnit = total / yieldQty;

  const { error: updErr } = await supabase
    .from("supplies")
    .update({ total_cost: round2(total), cost_per_unit: round6(costPerUnit) })
    .eq("id", supplyId);
  if (updErr) console.error("[recalculateSupply] update", updErr);
}

// ---------------------------------------------------------------------------
// Recalcula uma ficha tecnica (technical_sheet)
// ---------------------------------------------------------------------------

export async function recalculateSheet(
  supabase: Client,
  sheetId: string,
): Promise<void> {
  const { data: sheet, error } = await supabase
    .from("technical_sheets")
    .select("*")
    .eq("id", sheetId)
    .single();
  if (error || !sheet) {
    if (error) console.error("[recalculateSheet] sheet", error);
    return;
  }

  const { data: ingredients, error: ingErr } = await supabase
    .from("sheet_ingredients")
    .select(
      "quantity, unit, ingredient_type, raw_material:raw_materials(*), supply:supplies(*)",
    )
    .eq("sheet_id", sheetId);
  if (ingErr) {
    console.error("[recalculateSheet] ingredients", ingErr);
    return;
  }

  let ingredientCostTotal = 0;
  for (const ing of ingredients ?? []) {
    const row = ing as unknown as {
      ingredient_type: "raw_material" | "supply";
      quantity: number;
      unit: Unit;
      raw_material: RawMaterialRow | null;
      supply:
        | (SupplyRow & { cost_per_unit: number })
        | null;
    };
    try {
      if (row.ingredient_type === "raw_material" && row.raw_material) {
        ingredientCostTotal += ingredientCost(
          Number(row.quantity),
          row.unit,
          row.raw_material,
        );
      } else if (row.ingredient_type === "supply" && row.supply) {
        const qtyBase = convertQuantity(
          Number(row.quantity),
          row.unit,
          row.supply.yield_unit,
        );
        ingredientCostTotal += qtyBase * Number(row.supply.cost_per_unit ?? 0);
      }
    } catch (e) {
      console.warn("[recalculateSheet] skip ingredient", e);
    }
  }

  const calc = calcSheetCosts({
    ingredientCost: ingredientCostTotal,
    gasCost: Number(sheet.gas_cost),
    energyCost: Number(sheet.energy_cost),
    packagingCost: Number(sheet.packaging_cost),
    laborCost: Number(sheet.labor_cost),
    otherFixedCosts: Number(sheet.other_fixed_costs),
    yieldQuantity: Number(sheet.yield_quantity),
    salePrice: Number(sheet.sale_price),
    desiredMargin: Number(sheet.desired_margin),
  });

  const { error: updErr } = await supabase
    .from("technical_sheets")
    .update({
      ingredient_cost: round2(ingredientCostTotal),
      total_cost: round2(calc.totalCost),
      cost_per_unit: round6(calc.costPerUnit),
      cmv_percentage: round2(calc.cmvPercentage),
      markup: Number(calc.markup.toFixed(4)),
      suggested_price: round2(calc.suggestedPrice),
      minimum_price: round2(calc.minimumPrice),
    })
    .eq("id", sheetId);
  if (updErr) console.error("[recalculateSheet] update", updErr);
}

// ---------------------------------------------------------------------------
// Cascade: matéria prima muda -> recalcular supplies que a usam -> sheets
// ---------------------------------------------------------------------------

export async function recalculateForRawMaterials(
  supabase: Client,
  rawMaterialIds: string[],
): Promise<void> {
  if (rawMaterialIds.length === 0) return;

  // 1. Encontrar supplies afetadas
  const { data: affectedSupplies } = await supabase
    .from("supply_ingredients")
    .select("supply_id")
    .in("raw_material_id", rawMaterialIds);
  const supplyIds = uniq(
    (affectedSupplies ?? []).map((r) => r.supply_id as string),
  );

  for (const id of supplyIds) {
    await recalculateSupply(supabase, id);
  }

  // 2. Encontrar sheets afetadas (direto pela matéria prima OU via supply)
  const { data: directSheets } = await supabase
    .from("sheet_ingredients")
    .select("sheet_id")
    .in("raw_material_id", rawMaterialIds);
  const { data: indirectSheets } =
    supplyIds.length > 0
      ? await supabase
          .from("sheet_ingredients")
          .select("sheet_id")
          .in("supply_id", supplyIds)
      : { data: [] as { sheet_id: string }[] };

  const sheetIds = uniq([
    ...(directSheets ?? []).map((r) => r.sheet_id as string),
    ...(indirectSheets ?? []).map((r) => r.sheet_id as string),
  ]);

  for (const id of sheetIds) {
    await recalculateSheet(supabase, id);
  }
}

export async function recalculateForSupplies(
  supabase: Client,
  supplyIds: string[],
): Promise<void> {
  if (supplyIds.length === 0) return;
  const { data: sheets } = await supabase
    .from("sheet_ingredients")
    .select("sheet_id")
    .in("supply_id", supplyIds);
  const sheetIds = uniq((sheets ?? []).map((r) => r.sheet_id as string));
  for (const id of sheetIds) {
    await recalculateSheet(supabase, id);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// expose for tests / debug
export { calcEffectiveCostPerUnit };

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}
