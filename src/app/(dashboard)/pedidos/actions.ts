"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOrganization } from "@/lib/auth/organization";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  deliveryTypeEnum,
  numberFromInput,
  orderStatusEnum,
  paymentMethodEnum,
  paymentStatusEnum,
  type ActionState,
} from "@/lib/validation";
import { calcOrderTotals } from "@/lib/utils";
import type {
  DeliveryType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  SalesChannel,
} from "@/types";

// `initialOrderState` foi removido: Next 16 nao permite exports nao-async em
// arquivos "use server". Componentes chamam emptyActionState() inline.

const orderFormSchema = z.object({
  customer_id: z.string().uuid().optional().or(z.literal("")),
  customer_name: z.string().max(120).optional().or(z.literal("")),
  sales_channel_id: z.string().uuid().optional().or(z.literal("")),
  order_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data invalida.")
    .optional()
    .or(z.literal("")),
  delivery_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data invalida.")
    .optional()
    .or(z.literal("")),
  delivery_type: deliveryTypeEnum.default("retirada"),
  delivery_address: z.string().max(300).optional().or(z.literal("")),
  payment_status: paymentStatusEnum.default("nao_pago"),
  payment_method: paymentMethodEnum.default("pix"),
  amount_paid: numberFromInput.optional(),
  order_status: orderStatusEnum.default("novo"),
  notes: z.string().max(500).optional().or(z.literal("")),
});

const orderItemFormSchema = z.object({
  technical_sheet_id: z.string().uuid().optional().or(z.literal("")),
  product_name: z.string().min(1, "Nome obrigatorio."),
  quantity: numberFromInput.refine(
    (n) => Number.isFinite(n) && Number.isInteger(n) && n > 0,
    { message: "Quantidade > 0." },
  ),
  unit_price: numberFromInput.refine((n) => n >= 0, {
    message: "Preco invalido.",
  }),
});

export async function createOrder(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { organization } = await requireOrganization();

  const baseParse = orderFormSchema.safeParse({
    customer_id: formData.get("customer_id") ?? "",
    customer_name: formData.get("customer_name") ?? "",
    sales_channel_id: formData.get("sales_channel_id") ?? "",
    order_date: formData.get("order_date") ?? "",
    delivery_date: formData.get("delivery_date") ?? "",
    delivery_type: formData.get("delivery_type") ?? "retirada",
    delivery_address: formData.get("delivery_address") ?? "",
    payment_status: formData.get("payment_status") ?? "nao_pago",
    payment_method: formData.get("payment_method") ?? "pix",
    amount_paid: formData.get("amount_paid") ?? "0",
    order_status: formData.get("order_status") ?? "novo",
    notes: formData.get("notes") ?? "",
  });
  if (!baseParse.success) {
    return {
      ok: false,
      error: "Dados do pedido invalidos: " + (baseParse.error.issues[0]?.message ?? ""),
    };
  }

  const itemRows = collectItems(formData);
  if (itemRows.length === 0) {
    return { ok: false, error: "Adicione ao menos um item." };
  }

  const items: Array<{
    technical_sheet_id: string | null;
    product_name: string;
    quantity: number;
    unit_price: number;
  }> = [];
  for (const row of itemRows) {
    const parsed = orderItemFormSchema.safeParse(row);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Item invalido: " + (parsed.error.issues[0]?.message ?? "verifique"),
      };
    }
    items.push({
      technical_sheet_id: parsed.data.technical_sheet_id || null,
      product_name: parsed.data.product_name,
      quantity: parsed.data.quantity,
      unit_price: parsed.data.unit_price,
    });
  }

  const supabase = createAdminClient();

  // Taxa do canal (se houver)
  let feePct = 0;
  const channelId = baseParse.data.sales_channel_id || null;
  if (channelId) {
    const { data: channel } = await supabase
      .from("sales_channels")
      .select("fee_percentage")
      .eq("id", channelId)
      .maybeSingle();
    feePct = Number(
      (channel as Pick<SalesChannel, "fee_percentage"> | null)?.fee_percentage ?? 0,
    );
  }

  const { grossAmount, netAmount } = calcOrderTotals(
    items.map((i) => ({ quantity: i.quantity, unitPrice: i.unit_price })),
    feePct,
  );

  const customerId = baseParse.data.customer_id || null;
  let customerName = baseParse.data.customer_name?.trim() || null;
  if (customerId && !customerName) {
    const { data: cust } = await supabase
      .from("customers")
      .select("name")
      .eq("id", customerId)
      .maybeSingle();
    customerName = (cust as { name: string } | null)?.name ?? null;
  }

  const paymentStatus: PaymentStatus = baseParse.data.payment_status;
  const amountPaidRaw = Number(baseParse.data.amount_paid ?? 0);
  const amountPaid =
    paymentStatus === "pago"
      ? grossAmount
      : paymentStatus === "sinal_pago"
        ? round2(amountPaidRaw)
        : 0;

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      organization_id: organization.id,
      sales_channel_id: channelId,
      customer_id: customerId,
      customer_name: customerName,
      order_date:
        baseParse.data.order_date || new Date().toISOString().slice(0, 10),
      delivery_date: baseParse.data.delivery_date || null,
      delivery_type: baseParse.data.delivery_type as DeliveryType,
      delivery_address:
        baseParse.data.delivery_type === "entrega"
          ? baseParse.data.delivery_address || null
          : null,
      order_status: baseParse.data.order_status as OrderStatus,
      payment_status: paymentStatus,
      payment_method: baseParse.data.payment_method as PaymentMethod,
      amount_paid: amountPaid,
      notes: baseParse.data.notes || null,
      total_amount: round2(grossAmount),
      net_amount: round2(netAmount),
    })
    .select("id")
    .single();
  if (orderErr || !order) {
    console.error("[createOrder]", orderErr);
    return { ok: false, error: "Erro ao salvar pedido." };
  }

  const { error: itemsErr } = await supabase.from("order_items").insert(
    items.map((i) => ({
      order_id: order.id,
      technical_sheet_id: i.technical_sheet_id,
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: i.unit_price,
    })),
  );
  if (itemsErr) {
    console.error("[createOrder items]", itemsErr);
    await supabase.from("orders").delete().eq("id", order.id);
    return { ok: false, error: "Erro ao salvar itens." };
  }

  if (customerId) {
    const { data: cust } = await supabase
      .from("customers")
      .select("order_count")
      .eq("id", customerId)
      .maybeSingle();
    const nextCount =
      (Number((cust as { order_count?: number } | null)?.order_count) || 0) + 1;
    const { error: bumpErr } = await supabase
      .from("customers")
      .update({ order_count: nextCount })
      .eq("id", customerId);
    if (bumpErr) {
      console.error("[createOrder] bump order_count", bumpErr);
    }
    revalidatePath(`/clientes/${customerId}`);
    revalidatePath("/clientes");
  }

  revalidatePath("/pedidos");
  revalidatePath("/dashboard");
  redirect("/pedidos");
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  await requireOrganization();
  const supabase = createAdminClient();
  await supabase.from("orders").update({ order_status: status }).eq("id", id);
  revalidatePath("/pedidos");
  revalidatePath("/dashboard");
}

export async function updateOrderPayment(
  id: string,
  payment_status: PaymentStatus,
  amount_paid?: number,
) {
  await requireOrganization();
  const supabase = createAdminClient();
  const { data: cur } = await supabase
    .from("orders")
    .select("total_amount")
    .eq("id", id)
    .maybeSingle();
  const total = Number((cur as { total_amount: number } | null)?.total_amount ?? 0);
  const value =
    payment_status === "pago"
      ? total
      : payment_status === "nao_pago"
        ? 0
        : Math.max(0, Number(amount_paid ?? 0));
  await supabase
    .from("orders")
    .update({ payment_status, amount_paid: round2(value) })
    .eq("id", id);
  revalidatePath("/pedidos");
  revalidatePath("/dashboard");
}

const orderEditSchema = z.object({
  order_status: orderStatusEnum,
  payment_status: paymentStatusEnum,
  payment_method: paymentMethodEnum,
  amount_paid: numberFromInput.optional(),
  delivery_date: z.string().optional().or(z.literal("")),
  delivery_type: deliveryTypeEnum,
  delivery_address: z.string().max(300).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export async function updateOrderFromModal(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireOrganization();
  const parsed = orderEditSchema.safeParse({
    order_status: formData.get("order_status"),
    payment_status: formData.get("payment_status"),
    payment_method: formData.get("payment_method"),
    amount_paid: formData.get("amount_paid") ?? 0,
    delivery_date: formData.get("delivery_date") ?? "",
    delivery_type: formData.get("delivery_type"),
    delivery_address: formData.get("delivery_address") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: "Dados invalidos." };
  }

  const supabase = createAdminClient();
  const { data: cur } = await supabase
    .from("orders")
    .select("total_amount")
    .eq("id", id)
    .maybeSingle();
  const total = Number((cur as { total_amount: number } | null)?.total_amount ?? 0);
  const amountPaid =
    parsed.data.payment_status === "pago"
      ? total
      : parsed.data.payment_status === "nao_pago"
        ? 0
        : Math.max(0, Number(parsed.data.amount_paid ?? 0));

  const { error } = await supabase
    .from("orders")
    .update({
      order_status: parsed.data.order_status,
      payment_status: parsed.data.payment_status,
      payment_method: parsed.data.payment_method,
      amount_paid: round2(amountPaid),
      delivery_date: parsed.data.delivery_date || null,
      delivery_type: parsed.data.delivery_type,
      delivery_address:
        parsed.data.delivery_type === "entrega"
          ? parsed.data.delivery_address || null
          : null,
      notes: parsed.data.notes || null,
    })
    .eq("id", id);
  if (error) {
    console.error("[updateOrderFromModal]", error);
    return { ok: false, error: "Erro ao salvar." };
  }
  revalidatePath("/pedidos");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteOrder(id: string) {
  await requireOrganization();
  const supabase = createAdminClient();
  await supabase.from("orders").delete().eq("id", id);
  revalidatePath("/pedidos");
  revalidatePath("/dashboard");
}

function collectItems(
  formData: FormData,
): Array<Record<string, FormDataEntryValue>> {
  const map = new Map<number, Record<string, FormDataEntryValue>>();
  for (const [key, value] of formData.entries()) {
    const match = /^items\.(\d+)\.([a-z_]+)$/.exec(key);
    if (!match) continue;
    const idx = Number(match[1]);
    const field = match[2];
    if (!map.has(idx)) map.set(idx, {});
    map.get(idx)![field] = value;
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, row]) => row)
    .filter((row) => String(row.product_name ?? "").trim() !== "");
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
