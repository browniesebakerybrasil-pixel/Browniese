import Link from "next/link";
import { requireOrganization } from "@/lib/auth/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { CardHeader } from "@/components/ui/card";
import { CustomerSearch } from "@/components/clientes/customer-search";
import type { Customer } from "@/types";

export const metadata = { title: "Clientes" };

export default async function CustomersPage() {
  const { organization } = await requireOrganization();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("customers")
    .select("*")
    .eq("organization_id", organization.id)
    .order("name");
  const customers = (data ?? []) as Customer[];

  return (
    <div className="space-y-8">
      <CardHeader
        title="Clientes"
        description="Sua base de relacionamento. Cada 10 pedidos = 1 mimo de fidelidade."
        action={
          <Link href="/clientes/novo">
            <Button>+ Novo cliente</Button>
          </Link>
        }
      />
      <CustomerSearch customers={customers} />
    </div>
  );
}
