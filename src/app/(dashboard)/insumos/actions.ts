"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganization } from "@/lib/auth/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  parseFormData,
  supplyIngredientSchema,
  supplySchema,
  type ActionState,
} from "@/lib/validation";
import {
  recalculateForSupplies,
  recalculateSupply,
} from "@/lib/services/recalculate";

export async function createSupply(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { organization } = await requireOrganization();
  const parsed = parseFormData(supplySchema, formData);
  if (!parsed.ok || !parsed.data) return parsed;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("supplies")
    .insert({
      organization_id: organization.id,
      ...parsed.data,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[createSupply]", error);
    return { ok: false, error: "Erro ao criar insumo." };
  }
  revalidatePath("/insumos");
  redirect(`/insumos/${data.id}`);
}

export async function updateSupply(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireOrganization();
  const parsed = parseFormData(supplySchema, formData);
  if (!parsed.ok || !parsed.data) return parsed;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("supplies")
    .update(parsed.data)
    .eq("id", id);
  if (error) {
    console.error("[updateSupply]", error);
    return { ok: false, error: "Erro ao atualizar insumo." };
  }

  await recalculateSupply(supabase, id);
  await recalculateForSupplies(supabase, [id]);

  revalidatePath("/insumos");
  revalidatePath(`/insumos/${id}`);
  revalidatePath("/fichas-tecnicas");
  return { ok: true };
}

export async function deleteSupply(id: string) {
  await requireOrganization();
  const supabase = createAdminClient();
  const { error } = await supabase.from("supplies").delete().eq("id", id);
  if (error) {
    console.error("[deleteSupply]", error);
    return {
      ok: false,
      error:
        "Este insumo está em uso em alguma ficha técnica. Remova-o das fichas antes.",
    };
  }
  revalidatePath("/insumos");
  redirect("/insumos");
}

export async function addSupplyIngredient(
  supplyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireOrganization();
  const parsed = parseFormData(supplyIngredientSchema, formData);
  if (!parsed.ok || !parsed.data) return parsed;

  const supabase = createAdminClient();
  const { error } = await supabase.from("supply_ingredients").insert({
    supply_id: supplyId,
    ...parsed.data,
  });
  if (error) {
    console.error("[addSupplyIngredient]", error);
    return { ok: false, error: "Erro ao adicionar ingrediente." };
  }

  await recalculateSupply(supabase, supplyId);
  await recalculateForSupplies(supabase, [supplyId]);

  revalidatePath(`/insumos/${supplyId}`);
  revalidatePath("/fichas-tecnicas");
  return { ok: true };
}

export async function removeSupplyIngredient(
  supplyId: string,
  ingredientId: string,
) {
  await requireOrganization();
  const supabase = createAdminClient();
  await supabase.from("supply_ingredients").delete().eq("id", ingredientId);

  await recalculateSupply(supabase, supplyId);
  await recalculateForSupplies(supabase, [supplyId]);

  revalidatePath(`/insumos/${supplyId}`);
  revalidatePath("/fichas-tecnicas");
}
