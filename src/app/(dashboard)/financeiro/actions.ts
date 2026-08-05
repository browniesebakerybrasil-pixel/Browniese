"use server";

import { revalidatePath } from "next/cache";
import { requireOrganization } from "@/lib/auth/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  fixedCostSchema,
  parseFormData,
  type ActionState,
} from "@/lib/validation";

function ensureMaster(plan: string) {
  if (plan !== "master") {
    return {
      ok: false as const,
      error: "Módulo Financeiro disponível apenas no plano Master.",
    };
  }
  return null;
}

export async function createFixedCost(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { organization } = await requireOrganization();
  const gate = ensureMaster(organization.plan);
  if (gate) return gate;

  const parsed = parseFormData(fixedCostSchema, formData);
  if (!parsed.ok || !parsed.data) return parsed;

  const supabase = createAdminClient();
  const { error } = await supabase.from("fixed_costs").insert({
    organization_id: organization.id,
    ...parsed.data,
  });
  if (error) {
    console.error("[createFixedCost]", error);
    return { ok: false, error: "Erro ao salvar custo." };
  }
  revalidatePath("/financeiro");
  return { ok: true };
}

export async function deleteFixedCost(id: string) {
  const { organization } = await requireOrganization();
  if (organization.plan !== "master") return;
  const supabase = createAdminClient();
  await supabase.from("fixed_costs").delete().eq("id", id);
  revalidatePath("/financeiro");
}
