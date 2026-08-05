import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Organization } from "@/types";

/**
 * Resultado do helper.
 */
export interface OrganizationLookup {
  userId: string;
  organization: Organization | null;
}

/**
 * Busca a organizacao vinculada ao Clerk user atual, sem redirect.
 */
export async function getOrganization(): Promise<OrganizationLookup | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[getOrganization]", error);
    throw error;
  }

  return { userId, organization: (data ?? null) as Organization | null };
}

/**
 * Garante que existe uma organizacao para o usuario logado. Se nao houver,
 * cria uma automaticamente (sem passar por tela de onboarding). Retorna a
 * organizacao pronta para uso.
 *
 * Uso: em todas as rotas do dashboard.
 */
export async function requireOrganization(): Promise<{
  userId: string;
  organization: Organization;
}> {
  const lookup = await getOrganization();
  if (!lookup) redirect("/sign-in");

  if (lookup.organization) {
    return { userId: lookup.userId, organization: lookup.organization };
  }

  // Sem organizacao ainda — cria stub e retorna direto (sem tela de onboarding).
  const organization = await ensureOrganizationStub();
  return { userId: lookup.userId, organization };
}

/**
 * Cria (ou retorna) uma organizacao stub para o Clerk user atual.
 * Idempotente: se ja existir, retorna a existente sem sobrescrever.
 */
export async function ensureOrganizationStub(): Promise<Organization> {
  const user = await currentUser();
  if (!user) {
    throw new Error("ensureOrganizationStub: sem usuario autenticado");
  }

  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("organizations")
    .select("*")
    .eq("clerk_user_id", user.id)
    .maybeSingle();

  if (existing) return existing as Organization;

  const fallbackName =
    user.firstName?.trim() ||
    user.username ||
    user.emailAddresses[0]?.emailAddress?.split("@")[0] ||
    "Meu negocio";

  const { data, error } = await supabase
    .from("organizations")
    .insert({
      clerk_user_id: user.id,
      name: fallbackName,
      plan: "basico",
      plan_status: "trialing",
    })
    .select("*")
    .single();

  if (error) {
    console.error("[ensureOrganizationStub] insert", error);
    throw error;
  }

  return data as Organization;
}
