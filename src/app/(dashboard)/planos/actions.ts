"use server";

import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getStripe, STRIPE_PRICES, type PlanKey } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureOrganizationStub } from "@/lib/auth/organization";

/**
 * Inicia checkout do Stripe para o plano escolhido.
 * Cria/recupera o customer e atrela ao registro da organização.
 */
export async function startCheckout(plan: PlanKey) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const priceId = STRIPE_PRICES[plan];
  if (!priceId) {
    return {
      ok: false as const,
      error:
        "Price ID do plano não configurado. Defina NEXT_PUBLIC_STRIPE_PRICE_* no .env.local.",
    };
  }

  const user = await currentUser();
  const org = await ensureOrganizationStub();
  const supabase = createAdminClient();
  const stripe = getStripe();

  let customerId = org.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user?.emailAddresses[0]?.emailAddress,
      name: org.name,
      metadata: {
        organization_id: org.id,
        clerk_user_id: userId,
      },
    });
    customerId = customer.id;
    await supabase
      .from("organizations")
      .update({ stripe_customer_id: customerId })
      .eq("id", org.id);
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${baseUrl}/configuracoes?checkout=success`,
    cancel_url: `${baseUrl}/planos?checkout=cancel`,
    metadata: {
      organization_id: org.id,
      plan,
    },
    subscription_data: {
      metadata: {
        organization_id: org.id,
        plan,
      },
    },
  });

  if (session.url) redirect(session.url);
  return { ok: false as const, error: "Stripe não retornou URL." };
}

/**
 * Abre o Customer Portal do Stripe para o usuario gerenciar a assinatura.
 */
export async function openBillingPortal() {
  await auth();
  const org = await ensureOrganizationStub();
  if (!org.stripe_customer_id) {
    return {
      ok: false as const,
      error: "Você ainda não tem assinatura. Escolha um plano primeiro.",
    };
  }
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const stripe = getStripe();
  const portal = await stripe.billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: `${baseUrl}/configuracoes`,
  });
  redirect(portal.url);
}
