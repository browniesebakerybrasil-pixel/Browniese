import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth/organization";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Endpoint que gera CSV do relatorio diario.
 * Disponivel apenas para planos Full e Master.
 */
export async function GET(req: Request) {
  const { organization } = await requireOrganization();
  if (organization.plan === "basico") {
    return NextResponse.json({ error: "Plano sem acesso" }, { status: 403 });
  }

  const url = new URL(req.url);
  const date = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  const supabase = createAdminClient();
  const { data: orders } = await supabase
    .from("orders")
    .select(
      "order_time, total_amount, net_amount, channel:sales_channels(name, fee_percentage), items:order_items(product_name, quantity, unit_price, total_price)",
    )
    .eq("organization_id", organization.id)
    .eq("order_date", date)
    .order("order_time", { ascending: true });

  const lines: string[] = [];
  lines.push(
    [
      "data",
      "hora",
      "canal",
      "taxa_canal_%",
      "produto",
      "qtd",
      "preco_unit",
      "subtotal",
      "pedido_bruto",
      "pedido_liquido",
    ].join(";"),
  );

  for (const o of (orders ?? []) as unknown as Array<{
    order_time: string;
    total_amount: number;
    net_amount: number;
    channel: { name: string; fee_percentage: number } | null;
    items: Array<{
      product_name: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }>;
  }>) {
    const time = new Date(o.order_time).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    for (const it of o.items) {
      lines.push(
        [
          date,
          time,
          q(o.channel?.name ?? ""),
          fmt(o.channel?.fee_percentage ?? 0),
          q(it.product_name),
          fmt(it.quantity),
          fmt(it.unit_price),
          fmt(it.total_price),
          fmt(o.total_amount),
          fmt(o.net_amount),
        ].join(";"),
      );
    }
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="browniese-${date}.csv"`,
    },
  });
}

function fmt(n: number | string): string {
  if (typeof n === "string") n = Number(n);
  if (!Number.isFinite(n)) return "";
  return String(n).replace(".", ",");
}

function q(s: string): string {
  return `"${s.replace(/"/g, '""')}"`;
}
