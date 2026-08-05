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

  const payload = withPackagingSum(parsed.data);
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
  await requireOrganization();
  const parsed = parseFormData(technicalSheetSchema, formData);
  if (!parsed.ok || !parsed.data) return parsed;

  const supabase = createAdminClient();
  const payload = withPackagingSum(parsed.data);
  const { error } = await supabase
    .from("technical_sheets")
    .update(payload)
    .eq("id", id);
  if (error) {
    console.error("[updateTechnicalSheet]", error);
    return { ok: false, error: "Erro ao atualizar ficha." };
  }

  await recalculateSheet(supabase, id);

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
  await requireOrganization();
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

  revalidatePath(`/fichas-tecnicas/${sheetId}`);
  return { ok: true };
}

export async function removeSheetIngredient(
  sheetId: string,
  ingredientId: string,
) {
  await requireOrganization();
  const supabase = createAdminClient();
  await supabase.from("sheet_ingredients").delete().eq("id", ingredientId);
  await recalculateSheet(supabase, sheetId);
  revalidatePath(`/fichas-tecnicas/${sheetId}`);
}
