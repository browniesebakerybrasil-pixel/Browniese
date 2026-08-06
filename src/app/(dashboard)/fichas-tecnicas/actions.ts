"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganization } from "@/lib/auth/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  parseFormData,
  sheetIngredientSchema,
  technicalSheetSchema,
  type ActionState,
} from "@/lib/validation";
import { recalculateSheet } from "@/lib/services/recalculate";

const SHEET_LIMIT_BASICO = 50;

export async function createTechnicalSheet(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { organization } = await requireOrganization();
  const parsed = parseFormData(technicalSheetSchema, formData);
  if (!parsed.ok || !parsed.data) return parsed;

  const supabase = createAdminClient();

  // Plano basico: limite de 50 fichas
  if (organization.plan === "basico") {
    const { count } = await supabase
      .from("technical_sheets")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organization.id);
    if ((count ?? 0) >= SHEET_LIMIT_BASICO) {
      return {
        ok: false,
        error: `Plano Básico permite até ${SHEET_LIMIT_BASICO} fichas. Faça upgrade para criar mais.`,
      };
    }
  }

  const payload = withRetailSync(withPackagingSum(parsed.data));
  const { data, error } = await supabase
    .from("technical_sheets")
    .insert({ organization_id: organization.id, ...payload })
    .select("id")
    .single();
  if (error) {
    console.error("[createTechnicalSheet]", error);
    return { ok: false, error: "Erro ao criar ficha." };
  }
  revalidatePath("/fichas-tecnicas");
  redirect(`/fichas-tecnicas/${data.id}`);
}

export async function updateTechnicalSheet(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { organization } = await requireOrganization();
  const parsed = parseFormData(technicalSheetSchema, formData);
  if (!parsed.ok || !parsed.data) return parsed;

  const supabase = createAdminClient();

  // Busca o estado anterior pra montar o diff do histórico
  const { data: before } = await supabase
    .from("technical_sheets")
    .select(
      "sale_price, desired_margin, packaging_cost, packaging_items, pricing_tiers, absolute_min_price",
    )
    .eq("id", id)
    .maybeSingle();

  const payload = withRetailSync(withPackagingSum(parsed.data));
  const { error } = await supabase
    .from("technical_sheets")
    .update(payload)
    .eq("id", id);
  if (error) {
    console.error("[updateTechnicalSheet]", error);
    return { ok: false, error: "Erro ao atualizar ficha." };
  }

  await recalculateSheet(supabase, id);

  // Registra mudancas relevantes no historico (best-effort, nao bloqueia)
  await logSheetDiff(supabase, organization.id, id, before, payload);

  revalidatePath("/fichas-tecnicas");
  revalidatePath(`/fichas-tecnicas/${id}`);
  return { ok: true };
}

/**
 * Se a ficha tem lista de embalagens (packaging_items), o packaging_cost total
 * é a soma dos itens — sobrescreve o que veio no form. Se a lista está vazia,
 * mantém o packaging_cost avulso que o usuário digitou (legado).
 */
function withPackagingSum<
  T extends {
    packaging_items?: Array<{ name: string; cost: number }>;
    packaging_cost?: number;
  },
>(data: T): T {
  const items = data.packaging_items ?? [];
  if (items.length === 0) return data;
  const sum = items.reduce(
    (acc, it) => acc + (Number(it.cost) || 0),
    0,
  );
  return { ...data, packaging_cost: Math.round(sum * 100) / 100 };
}

/**
 * Se pricing_tiers tem tier "varejo", sincroniza sale_price/desired_margin
 * com esse tier. Isso mantém compatibilidade com KPIs, CMV e outras telas
 * que ainda leem sale_price/desired_margin diretos.
 */
function withRetailSync<
  T extends {
    pricing_tiers?: Array<{
      key: string;
      label: string;
      target_margin: number;
      price: number;
    }>;
    sale_price?: number;
    desired_margin?: number;
  },
>(data: T): T {
  const tiers = data.pricing_tiers ?? [];
  const retail = tiers.find((t) => t.key === "varejo") ?? tiers[0];
  if (!retail) return data;
  return {
    ...data,
    sale_price: Math.round(Number(retail.price) * 100) / 100,
    desired_margin: Math.round(Number(retail.target_margin) * 100) / 100,
  };
}

export async function deleteTechnicalSheet(id: string) {
  await requireOrganization();
  const supabase = createAdminClient();
  await supabase.from("technical_sheets").delete().eq("id", id);
  revalidatePath("/fichas-tecnicas");
  redirect("/fichas-tecnicas");
}

export async function addSheetIngredient(
  sheetId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { organization } = await requireOrganization();
  const parsed = parseFormData(sheetIngredientSchema, formData);
  if (!parsed.ok || !parsed.data) return parsed;

  const supabase = createAdminClient();
  const payload =
    parsed.data.ingredient_type === "raw_material"
      ? {
          sheet_id: sheetId,
          ingredient_type: "raw_material",
          raw_material_id: parsed.data.raw_material_id,
          supply_id: null,
          quantity: parsed.data.quantity,
          unit: parsed.data.unit,
        }
      : {
          sheet_id: sheetId,
          ingredient_type: "supply",
          raw_material_id: null,
          supply_id: parsed.data.supply_id,
          quantity: parsed.data.quantity,
          unit: parsed.data.unit,
        };

  const { error } = await supabase.from("sheet_ingredients").insert(payload);
  if (error) {
    console.error("[addSheetIngredient]", error);
    return { ok: false, error: "Erro ao adicionar ingrediente." };
  }

  await recalculateSheet(supabase, sheetId);

  // Registra no historico
  const label = await ingredientLabel(supabase, parsed.data);
  await logSheetHistory(supabase, organization.id, sheetId, {
    event_type: "ingredient_added",
    to_value: `${parsed.data.quantity} ${parsed.data.unit} de ${label}`,
    description: null,
  });

  revalidatePath(`/fichas-tecnicas/${sheetId}`);
  return { ok: true };
}

export async function removeSheetIngredient(
  sheetId: string,
  ingredientId: string,
) {
  const { organization } = await requireOrganization();
  const supabase = createAdminClient();

  // Pega o nome antes de deletar
  const { data: prev } = await supabase
    .from("sheet_ingredients")
    .select(
      "quantity, unit, raw_material:raw_materials(name), supply:supplies(name)",
    )
    .eq("id", ingredientId)
    .maybeSingle();

  await supabase.from("sheet_ingredients").delete().eq("id", ingredientId);
  await recalculateSheet(supabase, sheetId);

  if (prev) {
    const p = prev as unknown as {
      quantity: number;
      unit: string;
      raw_material: { name: string } | null;
      supply: { name: string } | null;
    };
    const label = p.raw_material?.name ?? p.supply?.name ?? "ingrediente";
    await logSheetHistory(supabase, organization.id, sheetId, {
      event_type: "ingredient_removed",
      from_value: `${p.quantity} ${p.unit} de ${label}`,
      description: null,
    });
  }
  revalidatePath(`/fichas-tecnicas/${sheetId}`);
}

// ---------------------------------------------------------------------------
// Histórico — helpers (migration 005)
// ---------------------------------------------------------------------------

type SupabaseCli = ReturnType<typeof createAdminClient>;

/**
 * Log leve. Nunca bloqueia a operação principal (best-effort).
 * event_type é obrigatório; from/to/description opcionais.
 */
async function logSheetHistory(
  supabase: SupabaseCli,
  organizationId: string,
  sheetId: string,
  entry: {
    event_type:
      | "price"
      | "margin"
      | "packaging"
      | "ingredient_added"
      | "ingredient_removed"
      | "cmv";
    from_value?: string | null;
    to_value?: string | null;
    description?: string | null;
  },
) {
  try {
    await supabase.from("sheet_history").insert({
      organization_id: organizationId,
      sheet_id: sheetId,
      event_type: entry.event_type,
      from_value: entry.from_value ?? null,
      to_value: entry.to_value ?? null,
      description: entry.description ?? null,
    });
  } catch (e) {
    console.error("[logSheetHistory]", e);
  }
}

/**
 * Compara o estado anterior com o novo e loga o que mudou. Só campos
 * relevantes pro usuário: preço, margem e embalagem.
 */
async function logSheetDiff(
  supabase: SupabaseCli,
  organizationId: string,
  sheetId: string,
  before:
    | {
        sale_price?: number;
        desired_margin?: number;
        packaging_cost?: number;
        packaging_items?: Array<{ name: string; cost: number }>;
        pricing_tiers?: Array<{
          key: string;
          label: string;
          target_margin: number;
          price: number;
        }>;
        absolute_min_price?: number | null;
      }
    | null,
  after: {
    sale_price?: number;
    desired_margin?: number;
    packaging_cost?: number;
    packaging_items?: Array<{ name: string; cost: number }>;
    pricing_tiers?: Array<{
      key: string;
      label: string;
      target_margin: number;
      price: number;
    }>;
    absolute_min_price?: number | null;
  },
) {
  if (!before) return;

  const oldPrice = Number(before.sale_price ?? 0);
  const newPrice = Number(after.sale_price ?? 0);
  if (Math.abs(oldPrice - newPrice) > 0.001) {
    await logSheetHistory(supabase, organizationId, sheetId, {
      event_type: "price",
      from_value: fmtBRL(oldPrice),
      to_value: fmtBRL(newPrice),
    });
  }

  const oldMargin = Number(before.desired_margin ?? 0);
  const newMargin = Number(after.desired_margin ?? 0);
  if (Math.abs(oldMargin - newMargin) > 0.001) {
    await logSheetHistory(supabase, organizationId, sheetId, {
      event_type: "margin",
      from_value: `${oldMargin}%`,
      to_value: `${newMargin}%`,
    });
  }

  const oldPkg = Number(before.packaging_cost ?? 0);
  const newPkg = Number(after.packaging_cost ?? 0);
  if (Math.abs(oldPkg - newPkg) > 0.001) {
    const newItems = after.packaging_items ?? [];
    const description =
      newItems.length > 0
        ? newItems.map((i) => `${i.name} ${fmtBRL(i.cost)}`).join(" · ")
        : null;
    await logSheetHistory(supabase, organizationId, sheetId, {
      event_type: "packaging",
      from_value: fmtBRL(oldPkg),
      to_value: fmtBRL(newPkg),
      description,
    });
  }

  // Log preços por tier (migration 006). Detecta mudanças por chave.
  const beforeTiers = before.pricing_tiers ?? [];
  const afterTiers = after.pricing_tiers ?? [];
  const beforeByKey = new Map(beforeTiers.map((t) => [t.key, t]));
  for (const t of afterTiers) {
    const prev = beforeByKey.get(t.key);
    if (!prev) continue;
    if (Math.abs(Number(prev.price) - Number(t.price)) > 0.001) {
      await logSheetHistory(supabase, organizationId, sheetId, {
        event_type: "price",
        from_value: `${t.label}: ${fmtBRL(prev.price)}`,
        to_value: `${t.label}: ${fmtBRL(t.price)}`,
      });
    }
    if (Math.abs(Number(prev.target_margin) - Number(t.target_margin)) > 0.001) {
      await logSheetHistory(supabase, organizationId, sheetId, {
        event_type: "margin",
        from_value: `${t.label}: ${prev.target_margin}%`,
        to_value: `${t.label}: ${t.target_margin}%`,
      });
    }
  }

  // Preço mínimo absoluto
  const oldAbs =
    before.absolute_min_price == null ? null : Number(before.absolute_min_price);
  const newAbs =
    after.absolute_min_price == null ? null : Number(after.absolute_min_price);
  if (oldAbs !== newAbs && (oldAbs != null || newAbs != null)) {
    await logSheetHistory(supabase, organizationId, sheetId, {
      event_type: "price",
      from_value: oldAbs != null ? `mínimo absoluto: ${fmtBRL(oldAbs)}` : "sem mínimo",
      to_value: newAbs != null ? `mínimo absoluto: ${fmtBRL(newAbs)}` : "sem mínimo",
    });
  }
}

async function ingredientLabel(
  supabase: SupabaseCli,
  data: {
    ingredient_type: "raw_material" | "supply";
    raw_material_id?: string | null;
    supply_id?: string | null;
  },
): Promise<string> {
  if (data.ingredient_type === "raw_material" && data.raw_material_id) {
    const { data: r } = await supabase
      .from("raw_materials")
      .select("name")
      .eq("id", data.raw_material_id)
      .maybeSingle();
    return (r as { name?: string } | null)?.name ?? "matéria prima";
  }
  if (data.ingredient_type === "supply" && data.supply_id) {
    const { data: s } = await supabase
      .from("supplies")
      .select("name")
      .eq("id", data.supply_id)
      .maybeSingle();
    return (s as { name?: string } | null)?.name ?? "insumo";
  }
  return "ingrediente";
}

function fmtBRL(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}
