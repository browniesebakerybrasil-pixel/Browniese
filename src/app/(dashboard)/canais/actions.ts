"use server";

import { revalidatePath } from "next/cache";
import { requireOrganization } from "@/lib/auth/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  parseFormData,
  salesChannelSchema,
  type ActionState,
} from "@/lib/validation";

export async function createSalesChannel(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { organization } = await requireOrganization();
  const parsed = parseFormData(salesChannelSchema, formData);
  if (!parsed.ok || !parsed.data) return parsed;

  const supabase = createAdminClient();
  const { error } = await supabase.from("sales_channels").insert({
    organization_id: organization.id,
    ...parsed.data,
  });
  if (error) {
    console.error("[createSalesChannel]", error);
    return { ok: false, error: "Erro ao criar canal." };
  }
  revalidatePath("/canais");
  return { ok: true };
}

export async function updateSalesChannel(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireOrganization();
  const parsed = parseFormData(salesChannelSchema, formData);
  if (!parsed.ok || !parsed.data) return parsed;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("sales_channels")
    .update(parsed.data)
    .eq("id", id);
  if (error) {
    console.error("[updateSalesChannel]", error);
    return { ok: false, error: "Erro ao atualizar canal." };
  }
  revalidatePath("/canais");
  return { ok: true };
}

export async function toggleSalesChannel(id: string, isActive: boolean) {
  await requireOrganization();
  const supabase = createAdminClient();
  await supabase
    .from("sales_channels")
    .update({ is_active: isActive })
    .eq("id", id);
  revalidatePath("/canais");
}

export async function deleteSalesChannel(id: string) {
  await requireOrganization();
  const supabase = createAdminClient();
  await supabase.from("sales_channels").delete().eq("id", id);
  revalidatePath("/canais");
}
