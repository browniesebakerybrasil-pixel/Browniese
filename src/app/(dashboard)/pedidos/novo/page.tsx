import Link from "next/link";
import { requireOrganization } from "@/lib/auth/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader } from "@/components/ui/card";
import { OrderForm } from "@/components/pedidos/order-form";
import type { Customer, SalesChannel, TechnicalSheet } from "@/types";

export const metadata = { title: "Novo pedido" };

export default async function NewOrderPage() {
  const { organization } = await requireOrganization();
  const supabase = createAdminClient();

  const [{ data: channels }, { data: sheets }, { data: customers }] =
    await Promise.all([
      supabase
        .from("sales_channels")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("technical_sheets")
        .select("id, name, sale_price")
        .eq("organization_id", organization.id)
        .order("name"),
      supabase
        .from("customers")
        .select("*")
        .eq("organization_id", organization.id)
        .order("name"),
    ]);

  return (
    <div className="max-w-4xl space-y-6">
      <CardHeader
        title="Novo pedido"
        description="Cliente, entrega, pagamento — tudo em uma única tela."
        action={
          <Link
            href="/pedidos"
            className="text-sm text-[var(--color-slate)] hover:underline"
          >
            Voltar
          </Link>
        }
      />
      <Card>
        <OrderForm
          channels={(channels ?? []) as SalesChannel[]}
          sheets={
            (sheets ?? []) as Pick<
              TechnicalSheet,
              "id" | "name" | "sale_price"
            >[]
          }
          customers={(customers ?? []) as Customer[]}
        />
      </Card>
    </div>
  );
}
