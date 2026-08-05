import { requireOrganization } from "@/lib/auth/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader, EmptyState } from "@/components/ui/card";
import { ChannelList } from "@/components/canais/channel-list";
import { ChannelForm } from "@/components/canais/channel-form";
import type { SalesChannel } from "@/types";

export const metadata = { title: "Canais de venda" };

export default async function ChannelsPage() {
  const { organization } = await requireOrganization();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("sales_channels")
    .select("*")
    .eq("organization_id", organization.id)
    .order("name");

  const channels = (data ?? []) as SalesChannel[];

  return (
    <div className="space-y-8">
      <CardHeader
        title="Canais de venda"
        description="Cadastre balcão, WhatsApp e plataformas de delivery com a taxa cobrada por cada uma. Usado para calcular o líquido dos pedidos."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          {channels.length === 0 ? (
            <EmptyState
              title="Nenhum canal ainda"
              description="Crie seu primeiro canal usando o formulário ao lado."
            />
          ) : (
            <ChannelList channels={channels} />
          )}
        </div>

        <Card>
          <h3 className="font-serif text-lg text-[var(--color-navy)]">
            Novo canal
          </h3>
          <p className="mt-1 text-xs text-[var(--color-slate)]">
            Ex.: iFood com taxa de 23%, Rappi com 25%, balcão com 0%.
          </p>
          <div className="mt-4">
            <ChannelForm mode="create" />
          </div>
        </Card>
      </div>
    </div>
  );
}
