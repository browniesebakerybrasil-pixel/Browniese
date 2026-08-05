"use server";

import { revalidatePath } from "next/cache";
import { requireOrganization } from "@/lib/auth/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  eventSchema,
  parseFormData,
  type ActionState,
} from "@/lib/validation";

export async function createEvent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { organization } = await requireOrganization();
  const parsed = parseFormData(eventSchema, formData);
  if (!parsed.ok || !parsed.data) return parsed;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("events")
    .insert({ organization_id: organization.id, ...parsed.data });
  if (error) {
    console.error("[createEvent]", error);
    return { ok: false, error: "Erro ao criar evento." };
  }
  revalidatePath("/eventos");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteEvent(id: string) {
  await requireOrganization();
  const supabase = createAdminClient();
  await supabase.from("events").delete().eq("id", id);
  revalidatePath("/eventos");
  revalidatePath("/dashboard");
}
