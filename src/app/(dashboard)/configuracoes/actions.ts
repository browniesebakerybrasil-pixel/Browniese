"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrganization } from "@/lib/auth/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  parseFormData,
  type ActionState,
} from "@/lib/validation";

const orgUpdateSchema = z.object({
  name: z.string().min(1, "Informe o nome.").max(80),
  type: z.enum([
    "hamburgueria",
    "confeitaria",
    "lanchonete",
    "restaurante",
    "delivery",
    "outro",
  ]),
});

export async function updateOrganization(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { organization } = await requireOrganization();
  const parsed = parseFormData(orgUpdateSchema, formData);
  if (!parsed.ok || !parsed.data) return parsed;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("organizations")
    .update(parsed.data)
    .eq("id", organization.id);
  if (error) {
    console.error("[updateOrganization]", error);
    return { ok: false, error: "Erro ao salvar." };
  }
  revalidatePath("/configuracoes");
  revalidatePath("/dashboard");
  return { ok: true };
}
