"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui/input";
import { createOrder } from "@/app/(dashboard)/pedidos/actions";
import { calcOrderTotals, formatCurrency } from "@/lib/utils";
import {
  emptyActionState,
  type ActionState as ActionStateT,
} from "@/lib/validation";
import type {
  Customer,
  DeliveryType,
  PaymentMethod,
  PaymentStatus,
  SalesChannel,
  TechnicalSheet,
} from "@/types";

interface ItemRow {
  technical_sheet_id: string;
  product_name: string;
  quantity: string;
  unit_price: string;
}

const blankItem = (): ItemRow => ({
  technical_sheet_id: "",
  product_name: "",
  quantity: "1",
  unit_price: "",
});

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "pix", label: "Pix" },
  { value: "credito", label: "Crédito" },
  { value: "debito", label: "Débito" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "vale", label: "Vale" },
];

const PAYMENT_STATUSES: Array<{ value: PaymentStatus; label: string }> = [
  { value: "nao_pago", label: "Não pago" },
  { value: "sinal_pago", label: "Sinal pago" },
  { value: "pago", label: "Pago" },
];

const DELIVERY_TYPES: Array<{ value: DeliveryType; label: string }> = [
  { value: "retirada", label: "Retirada" },
  { value: "entrega", label: "Entrega" },
];

export function OrderForm({
  channels,
  sheets,
  customers,
}: {
  channels: SalesChannel[];
  sheets: Pick<TechnicalSheet, "id" | "name" | "sale_price">[];
  customers: Customer[];
}) {
  const [items, setItems] = useState<ItemRow[]>([blankItem()]);
  const [channelId, setChannelId] = useState<string>(
    channels.find((c) => c.name.toLowerCase() === "balcão")?.id ??
      channels[0]?.id ??
      "",
  );
  const [customerId, setCustomerId] = useState<string>("");
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("retirada");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("nao_pago");
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");

  const [state, formAction, pending] = useActionState<
    ActionStateT,
    FormData
  >(createOrder, emptyActionState());

  const fee = useMemo(() => {
    const ch = channels.find((c) => c.id === channelId);
    return ch ? Number(ch.fee_percentage) : 0;
  }, [channelId, channels]);

  const totals = useMemo(() => {
    const numericItems = items.map((i) => ({
      quantity: Number(i.quantity) || 0,
      unitPrice: parseDecimal(i.unit_price),
    }));
    return calcOrderTotals(numericItems, fee);
  }, [items, fee]);

  function updateItem<K extends keyof ItemRow>(
    idx: number,
    key: K,
    value: ItemRow[K],
  ) {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [key]: value } : it)),
    );
  }

  function selectSheet(idx: number, sheetId: string) {
    const sheet = sheets.find((s) => s.id === sheetId);
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx
          ? {
              ...it,
              technical_sheet_id: sheetId,
              product_name: sheet?.name ?? it.product_name,
              unit_price: sheet
                ? String(Number(sheet.sale_price)).replace(".", ",")
                : it.unit_price,
            }
          : it,
      ),
    );
  }

  function selectCustomer(id: string) {
    setCustomerId(id);
    const cust = customers.find((c) => c.id === id);
    if (cust?.address && !deliveryAddress) {
      setDeliveryAddress(cust.address);
    }
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="customer_id">Cliente</Label>
          <Select
            id="customer_id"
            name="customer_id"
            value={customerId}
            onChange={(e) => selectCustomer(e.target.value)}
          >
            <option value="">Sem cliente cadastrado</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.whatsapp ? ` · ${c.whatsapp}` : ""}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="customer_name" hint="opcional se já selecionou acima">
            Ou nome avulso
          </Label>
          <Input
            id="customer_name"
            name="customer_name"
            placeholder="Cliente sem cadastro"
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <Label htmlFor="sales_channel_id">Canal</Label>
          <Select
            id="sales_channel_id"
            name="sales_channel_id"
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
          >
            <option value="">Sem canal</option>
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({Number(c.fee_percentage)}%)
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="order_date">Data do pedido</Label>
          <Input
            id="order_date"
            name="order_date"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div>
          <Label htmlFor="delivery_date">Data de entrega</Label>
          <Input id="delivery_date" name="delivery_date" type="date" />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="delivery_type">Tipo de entrega</Label>
          <Select
            id="delivery_type"
            name="delivery_type"
            value={deliveryType}
            onChange={(e) =>
              setDeliveryType(e.target.value as DeliveryType)
            }
          >
            {DELIVERY_TYPES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </Select>
        </div>
        {deliveryType === "entrega" ? (
          <div>
            <Label htmlFor="delivery_address">Endereço de entrega</Label>
            <Input
              id="delivery_address"
              name="delivery_address"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Rua, número, bairro, complemento"
            />
          </div>
        ) : null}
      </div>

      <div className="rounded-md border border-[var(--border)] p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg text-[var(--color-navy)]">
            Itens do pedido
          </h3>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setItems((p) => [...p, blankItem()])}
          >
            + Item
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="grid gap-2 rounded-md border border-[var(--border)] bg-white p-3 md:grid-cols-12"
            >
              <div className="md:col-span-5">
                <Label htmlFor={`sheet-${idx}`}>Produto</Label>
                <Select
                  id={`sheet-${idx}`}
                  name={`items.${idx}.technical_sheet_id`}
                  value={item.technical_sheet_id}
                  onChange={(e) => selectSheet(idx, e.target.value)}
                >
                  <option value="">— digitar manualmente —</option>
                  {sheets.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
                <Input
                  className="mt-1"
                  name={`items.${idx}.product_name`}
                  required
                  value={item.product_name}
                  onChange={(e) =>
                    updateItem(idx, "product_name", e.target.value)
                  }
                  placeholder="Nome do produto"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor={`qty-${idx}`}>Qtd</Label>
                <Input
                  id={`qty-${idx}`}
                  name={`items.${idx}.quantity`}
                  inputMode="numeric"
                  required
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                />
              </div>
              <div className="md:col-span-3">
                <Label htmlFor={`price-${idx}`} hint="R$">
                  Preço unit.
                </Label>
                <Input
                  id={`price-${idx}`}
                  name={`items.${idx}.unit_price`}
                  inputMode="decimal"
                  required
                  value={item.unit_price}
                  onChange={(e) =>
                    updateItem(idx, "unit_price", e.target.value)
                  }
                  placeholder="0,00"
                />
              </div>
              <div className="flex items-end justify-end md:col-span-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={items.length === 1}
                  onClick={() =>
                    setItems((p) => p.filter((_, i) => i !== idx))
                  }
                >
                  Remover
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <fieldset className="rounded-md border border-[var(--border)] p-4">
        <legend className="px-2 text-xs uppercase tracking-widest text-[var(--color-slate)]">
          Pagamento
        </legend>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label htmlFor="payment_method">Forma de pagamento</Label>
            <Select id="payment_method" name="payment_method" defaultValue="pix">
              {PAYMENT_METHODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="payment_status">Status</Label>
            <Select
              id="payment_status"
              name="payment_status"
              value={paymentStatus}
              onChange={(e) =>
                setPaymentStatus(e.target.value as PaymentStatus)
              }
            >
              {PAYMENT_STATUSES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>
          {paymentStatus === "sinal_pago" ? (
            <div>
              <Label htmlFor="amount_paid" hint="R$">
                Valor já pago
              </Label>
              <Input
                id="amount_paid"
                name="amount_paid"
                inputMode="decimal"
                placeholder="0,00"
              />
            </div>
          ) : (
            <input
              type="hidden"
              name="amount_paid"
              value={paymentStatus === "pago" ? totals.grossAmount : 0}
            />
          )}
        </div>
      </fieldset>

      <div>
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" name="notes" placeholder="Recados internos, preferências do cliente" />
      </div>

      <div className="grid gap-2 rounded-md bg-[var(--color-cream-50)] p-4 md:grid-cols-3">
        <Stat label="Bruto" value={formatCurrency(totals.grossAmount)} />
        <Stat
          label={`Taxa do canal (${fee}%)`}
          value={`- ${formatCurrency(totals.platformFee)}`}
        />
        <Stat
          label="Líquido"
          value={formatCurrency(totals.netAmount)}
          emphasize
        />
      </div>

      {state.error ? (
        <p className="text-sm text-red-700">{state.error}</p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Registrar pedido"}
        </Button>
      </div>
    </form>
  );
}

function Stat({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-[var(--color-slate)]">
        {label}
      </p>
      <p
        className={
          emphasize
            ? "mt-1 font-serif text-2xl text-[var(--color-navy)]"
            : "mt-1 font-medium text-[var(--color-navy)]"
        }
      >
        {value}
      </p>
    </div>
  );
}

function parseDecimal(v: string): number {
  if (!v) return 0;
  const cleaned = v.trim().replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}
