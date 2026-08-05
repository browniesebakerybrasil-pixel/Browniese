"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganization } from "@/lib/auth/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  parseFormData,
  rawMaterialSchema,
  type ActionState,
} from "@/lib/validation";
import { recalculateForRawMaterials } from "@/lib/services/recalculate";

export async function createRawMaterial(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { organization } = await requireOrganization();
  const parsed = parseFormData(rawMaterialSchema, formData);
  if (!parsed.ok || !parsed.data) return parsed;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("raw_materials")
    .insert({ organization_id: organization.id, ...parsed.data })
    .select("id")
    .single();
  if (error) {
    console.error("[createRawMaterial]", error);
    return { ok: false, error: "Erro ao criar matéria prima." };
  }
  revalidatePath("/materias-primas");
  redirect(`/materias-primas/${data.id}`);
}

export async function updateRawMaterial(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireOrganization();
  const parsed = parseFormData(rawMaterialSchema, formData);
  if (!parsed.ok || !parsed.data) return parsed;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("raw_materials")
    .update(parsed.data)
    .eq("id", id);
  if (error) {
    console.error("[updateRawMaterial]", error);
    return { ok: false, error: "Erro ao atualizar." };
  }

  // Cascade: recalcula todos os insumos e fichas que usam essa materia.
  await recalculateForRawMaterials(supabase, [id]);

  revalidatePath("/materias-primas");
  revalidatePath(`/materias-primas/${id}`);
  revalidatePath("/insumos");
  revalidatePath("/fichas-tecnicas");
  return { ok: true };
}

export async function deleteRawMaterial(id: string) {
  await requireOrganization();
  const supabase = createAdminClient();
  const { error } = await supabase.from("raw_materials").delete().eq("id", id);
  if (error) {
    // Provavelmente tem FK em supply_ingredients/sheet_ingredients (RESTRICT).
    console.error("[deleteRawMaterial]", error);
    return {
      ok: false,
      error:
        "Esta matéria está sendo usada em insumos/fichas. Remova das receitas antes.",
    };
  }
  revalidatePath("/materias-primas");
  redirect("/materias-primas");
}
