import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Plan, PlanStatus } from "@/types";

/**
 * Webhook do Stripe. Atualiza `organizations.plan` e `plan_status` em
 * resposta a checkout.session.completed e customer.subscription.*.
 *
 * Configure: stripe listen --forward-to localhost:3000/api/webhooks/stripe
 * e cole o whsec gerado em STRIPE_WEBHOOK_SECRET.
 */
export const runtime = "nodejs";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json(
      { error: "missing signature" },
      { status: 400 },
    );
  }

  const rawBody = await req.text();
  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error("[stripe webhook] verify", err);
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const orgId = session.metadata?.organization_id;
        const plan = (session.metadata?.plan ?? "basico") as Plan;
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;
        if (orgId) {
          await supabase
            .from("organizations")
            .update({
              plan,
              plan_status: "active",
              stripe_subscription_id: subId ?? null,
              stripe_customer_id: customerId ?? null,
            })
            .eq("id", orgId);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created":
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const orgId = sub.metadata?.organization_id;
        const plan = (sub.metadata?.plan ?? null) as Plan | null;
        const status = mapSubscriptionStatus(sub.status);
        if (orgId) {
          const update: Record<string, unknown> = {
            plan_status: status,
            stripe_subscription_id: sub.id,
          };
          if (plan) update.plan = plan;
          if (event.type === "customer.subscription.deleted") {
            update.plan = "basico";
            update.plan_status = "canceled";
          }
          await supabase.from("organizations").update(update).eq("id", orgId);
        }
        break;
      }

      default:
        // Ignora outros eventos por enquanto.
        break;
    }
  } catch (err) {
    console.error("[stripe webhook] handler", err);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function mapSubscriptionStatus(s: Stripe.Subscription.Status): PlanStatus {
  switch (s) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
      return "canceled";
    case "incomplete":
    case "incomplete_expired":
    case "paused":
      return "incomplete";
    default:
      return "incomplete";
  }
}
