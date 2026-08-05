"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganization } from "@/lib/auth/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  customerSchema,
  parseFormData,
  type ActionState,
} from "@/lib/validation";

// `initialCustomerState` foi removido: Next 16 nao permite exports nao-async
// em arquivos "use server". Componentes chamam emptyActionState() inline.

const LOYALTY_THRESHOLD = 10;

/**
 * Cria um novo cliente. Apos salvar redireciona para o perfil.
 */
export async function createCustomer(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { organization } = await requireOrganization();
  const parsed = parseFormData(customerSchema, formData);
  if (!parsed.ok || !parsed.data) return parsed;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({ organization_id: organization.id, ...parsed.data })
    .select("id")
    .single();
  if (error) {
    console.error("[createCustomer]", error);
    return { ok: false, error: "Erro ao salvar cliente." };
  }
  revalidatePath("/clientes");
  redirect(`/clientes/${data.id}`);
}

export async function updateCustomer(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireOrganization();
  const parsed = parseFormData(customerSchema, formData);
  if (!parsed.ok || !parsed.data) return parsed;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("customers")
    .update(parsed.data)
    .eq("id", id);
  if (error) {
    console.error("[updateCustomer]", error);
    return { ok: false, error: "Erro ao atualizar." };
  }
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { ok: true };
}

export async function deleteCustomer(id: string) {
  await requireOrganization();
  const supabase = createAdminClient();
  await supabase.from("customers").delete().eq("id", id);
  revalidatePath("/clientes");
  redirect("/clientes");
}

/**
 * Marca o "mimo de fidelidade" como entregue na data informada (ou hoje).
 * Quando o cliente atinge LOYALTY_THRESHOLD pedidos a UI sugere registrar.
 */
export async function markLoyaltyGift(id: string, date?: string) {
  await requireOrganization();
  const supabase = createAdminClient();
  const ref = date ?? new Date().toISOString().slice(0, 10);
  await supabase
    .from("customers")
    .update({ loyalty_gift_given: true, loyalty_gift_date: ref })
    .eq("id", id);
  revalidatePath(`/clientes/${id}`);
  revalidatePath("/clientes");
}

export async function resetLoyaltyGift(id: string) {
  await requireOrganization();
  const supabase = createAdminClient();
  await supabase
    .from("customers")
    .update({ loyalty_gift_given: false, loyalty_gift_date: null })
    .eq("id", id);
  revalidatePath(`/clientes/${id}`);
  revalidatePath("/clientes");
}

/**
 * Incrementa o contador de pedidos do cliente. Read-modify-write simples
 * porque o volume concorrente por organizacao e baixo. Threshold em
 * LOYALTY_THRESHOLD (local, sem export — "use server" nao permite).
 */
export async function bumpCustomerOrderCount(customerId: string) {
  const supabase = createAdminClient();
  const { data: cur } = await supabase
    .from("customers")
    .select("order_count")
    .eq("id", customerId)
    .maybeSingle();
  const next =
    (Number((cur as { order_count?: number } | null)?.order_count) || 0) + 1;
  await supabase
    .from("customers")
    .update({ order_count: next })
    .eq("id", customerId);

  // Quando atinge o threshold, somente revalida — a UI mostra o CTA do mimo.
  if (next >= LOYALTY_THRESHOLD) {
    revalidatePath(`/clientes/${customerId}`);
  }
}
