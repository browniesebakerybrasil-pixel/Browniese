"use client";

import { cn, formatCurrency } from "@/lib/utils";
import {
  PAYMENT_BADGE,
  PAYMENT_STATUS_LABEL,
} from "./order-constants";
import type { KanbanOrder } from "./types";

interface Props {
  order: KanbanOrder;
  onOpen: (id: string) => void;
  onMarkPaid: (id: string) => void;
  isDragging?: boolean;
  isDragOverlay?: boolean;
}

/**
 * Card de pedido do Kanban.
 * O drag-and-drop e gerenciado pelo Kanban via dnd-kit (useSortable).
 * - clique abre modal de detalhes
 * - botão Pago tem stopPropagation para nao disparar click do card
 */
export function OrderCard({
  order,
  onOpen,
  onMarkPaid,
  isDragging,
  isDragOverlay,
}: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const deliveryState: "future" | "today" | "past" | "none" = order.delivery_date
    ? order.delivery_date === today
      ? "today"
      : order.delivery_date < today
        ? "past"
        : "future"
    : "none";

  const deliveryStyle =
    deliveryState === "today"
      ? "bg-amber-100 text-amber-900 border-amber-300"
      : deliveryState === "past"
        ? "bg-red-100 text-red-800 border-red-300"
        : "bg-[var(--color-cream-50)] text-[var(--color-slate)] border-[var(--border)]";

  return (
    <article
      onClick={() => onOpen(order.id)}
      className={cn(
        "select-none rounded-md border bg-white p-3 shadow-sm transition-all",
        isDragOverlay
          ? "rotate-1 border-[var(--color-brown)] shadow-xl"
          : isDragging
            ? "border-[var(--color-brown)] opacity-40"
            : "border-[var(--border)] hover:border-[var(--color-navy)]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-slate)]">
            #{String(order.order_number).padStart(3, "0")}
          </p>
          <p className="mt-0.5 truncate text-sm font-medium text-[var(--color-navy)]">
            {order.customer_name ?? order.customer?.name ?? "Sem cliente"}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide",
            PAYMENT_BADGE[order.payment_status],
          )}
          title={PAYMENT_STATUS_LABEL[order.payment_status]}
        >
          {order.payment_status === "nao_pago"
            ? "Não pago"
            : order.payment_status === "sinal_pago"
              ? "Sinal"
              : "Pago"}
        </span>
      </div>

      <ul className="mt-2 space-y-0.5 text-xs text-[var(--color-slate)]">
        {order.items.slice(0, 3).map((it) => (
          <li key={it.id} className="truncate">
            {it.quantity}× {it.product_name}
          </li>
        ))}
        {order.items.length > 3 ? (
          <li className="italic">+{order.items.length - 3} item(ns)</li>
        ) : null}
      </ul>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-slate)]">
          <span title={order.delivery_type === "entrega" ? "Entrega" : "Retirada"}>
            {order.delivery_type === "entrega" ? "→ entrega" : "↑ retirada"}
          </span>
          {order.delivery_date ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
                deliveryStyle,
              )}
            >
              {deliveryState === "today" || deliveryState === "past" ? (
                <AlertIcon />
              ) : null}
              {formatDateShort(order.delivery_date)}
              {deliveryState === "today" ? " · hoje" : ""}
              {deliveryState === "past" ? " · atrasado" : ""}
            </span>
          ) : null}
        </div>
        <span className="text-base font-bold text-[var(--color-navy)]">
          {formatCurrency(Number(order.total_amount))}
        </span>
      </div>

      {order.payment_status !== "pago" ? (
        <button
          type="button"
          onClick={(e) => {
            // apenas impede que o click "atravesse" para o article (que abre o modal)
            e.stopPropagation();
            onMarkPaid(order.id);
          }}
          className="mt-3 w-full rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1.5 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-100 active:bg-emerald-200"
        >
          Marcar como pago
        </button>
      ) : null}
    </article>
  );
}

function AlertIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="11"
      height="11"
      aria-hidden
      fill="currentColor"
    >
      <path d="M8 1.5a1.1 1.1 0 0 1 .96.55l6.4 11.1A1.1 1.1 0 0 1 14.4 14.8H1.6a1.1 1.1 0 0 1-.96-1.65l6.4-11.1A1.1 1.1 0 0 1 8 1.5Zm0 5a.7.7 0 0 0-.7.7v3.2a.7.7 0 1 0 1.4 0V7.2a.7.7 0 0 0-.7-.7Zm0 6.6a.85.85 0 1 0 0-1.7.85.85 0 0 0 0 1.7Z" />
    </svg>
  );
}

function formatDateShort(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}
