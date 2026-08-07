"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import {
  applyFilters,
  defaultFilters,
  OrderFilters,
  type FiltersState,
} from "./order-filters";
import { OrderCard } from "./order-card";
import { OrderDetailModal } from "./order-detail-modal";
import { ORDER_COLUMNS, ORDER_STATUS_COLOR } from "./order-constants";
import {
  updateOrderPayment,
  updateOrderStatus,
} from "@/app/(dashboard)/pedidos/actions";
import type { OrderStatus, SalesChannel } from "@/types";
import type { KanbanOrder } from "./types";

interface Props {
  orders: KanbanOrder[];
  channels: SalesChannel[];
}

/**
 * Kanban com dnd-kit:
 *  - PointerSensor cobre mouse e pen, com `activationConstraint: { distance: 8 }`
 *    pra distinguir click de drag.
 *  - TouchSensor cobre iPad/celular com `delay: 150` (long-press curto) — o
 *    delay evita conflito com o scroll horizontal nativo da página.
 *  - KeyboardSensor garante acessibilidade.
 *  - SortableContext por coluna; arrastar para outra coluna chama
 *    updateOrderStatus.
 */
export function OrderKanban({ orders, channels }: Props) {
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const filtered = useMemo(
    () => applyFilters(orders, filters),
    [orders, filters],
  );

  const byStatus = useMemo(() => {
    const map: Record<OrderStatus, KanbanOrder[]> = {
      novo: [],
      confirmado: [],
      em_producao: [],
      pronto: [],
      saiu: [],
      entregue: [],
      cancelado: [],
    };
    for (const o of filtered) map[o.order_status].push(o);
    return map;
  }, [filtered]);

  const activeOrder = useMemo(
    () => (activeId ? orders.find((o) => o.id === activeId) ?? null : null),
    [orders, activeId],
  );

  const opened = useMemo(
    () => orders.find((o) => o.id === openId) ?? null,
    [orders, openId],
  );

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    setActiveId(null);
    if (!e.over) return;

    // overId pode ser o id de um card destino (mesma/outra coluna) OU
    // o id da coluna (quando soltou na area vazia).
    const overId = String(e.over.id);
    const order = orders.find((o) => o.id === id);
    if (!order) return;

    // Se o overId for um status conhecido -> e a coluna.
    const knownStatuses: OrderStatus[] = [
      "novo",
      "confirmado",
      "em_producao",
      "pronto",
      "saiu",
      "entregue",
      "cancelado",
    ];
    let target: OrderStatus | null = null;
    if ((knownStatuses as string[]).includes(overId)) {
      target = overId as OrderStatus;
    } else {
      const overOrder = orders.find((o) => o.id === overId);
      if (overOrder) target = overOrder.order_status;
    }
    if (!target || target === order.order_status) return;

    startTransition(() => {
      void updateOrderStatus(id, target!).catch(() => undefined);
    });
  }

  function markPaid(id: string) {
    startTransition(() => {
      void updateOrderPayment(id, "pago").catch(() => undefined);
    });
  }

  // Estabiliza onClose para evitar invalidar effects no modal a cada render
  // (o que pode causar ciclos de body-lock e flickers de tela).
  const closeModal = useCallback(() => setOpenId(null), []);

  return (
    <div className="space-y-4">
      <OrderFilters
        value={filters}
        onChange={setFilters}
        channels={channels}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div
          className="-mx-4 overflow-x-auto px-4 pb-3 md:mx-0 md:px-0"
          style={{
            WebkitOverflowScrolling: "touch",
            scrollBehavior: "smooth",
          }}
        >
          <div className="flex min-w-fit gap-3">
            {ORDER_COLUMNS.map((col) => (
              <KanbanColumn
                key={col.status}
                status={col.status}
                label={col.label}
                hint={col.hint}
                color={ORDER_STATUS_COLOR[col.status]}
                items={byStatus[col.status]}
                onOpen={setOpenId}
                onMarkPaid={markPaid}
                activeId={activeId}
              />
            ))}
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeOrder ? (
            <div style={{ width: 272 }}>
              <OrderCard
                order={activeOrder}
                onOpen={() => undefined}
                onMarkPaid={() => undefined}
                isDragOverlay
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <OrderDetailModal order={opened} onClose={closeModal} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function KanbanColumn({
  status,
  label,
  hint,
  color,
  items,
  onOpen,
  onMarkPaid,
  activeId,
}: {
  status: OrderStatus;
  label: string;
  hint: string;
  color: string;
  items: KanbanOrder[];
  onOpen: (id: string) => void;
  onMarkPaid: (id: string) => void;
  activeId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col overflow-hidden rounded-lg border bg-white shadow-sm transition-all",
        isOver
          ? "ring-2 ring-offset-1"
          : "border-[var(--border)]",
      )}
      style={
        isOver
          ? {
              borderColor: color,
              boxShadow: `0 0 0 2px ${color}33`,
            }
          : undefined
      }
    >
      {/* barra superior colorida */}
      <div className="h-1" style={{ backgroundColor: color }} />

      <header className="border-b border-[var(--border)] bg-white px-3 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3
            className="text-base font-semibold leading-tight"
            style={{ color }}
          >
            {label}
          </h3>
          <span className="rounded-full bg-[var(--color-cream-50)] px-2 py-0.5 text-xs font-medium text-[var(--color-slate)]">
            {items.length}
          </span>
        </div>
        {hint ? (
          <p className="mt-0.5 text-[11px] text-[var(--color-slate)]">{hint}</p>
        ) : null}
      </header>

      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-1 flex-col gap-2 bg-[var(--color-cream-50)] p-2">
          {items.map((o) => (
            <SortableCard
              key={o.id}
              order={o}
              onOpen={onOpen}
              onMarkPaid={onMarkPaid}
              isActive={activeId === o.id}
            />
          ))}
          {items.length === 0 ? (
            <div className="rounded-md border border-dashed border-[var(--border)] bg-white p-3 text-center text-xs text-[var(--color-slate)]">
              {isOver ? "solte aqui" : "—"}
            </div>
          ) : null}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableCard({
  order,
  onOpen,
  onMarkPaid,
  isActive,
}: {
  order: KanbanOrder;
  onOpen: (id: string) => void;
  onMarkPaid: (id: string) => void;
  isActive: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: order.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Handle de arraste é uma barra CLARA e ALTA no topo do card. O resto do
  // card fica livre pra cliques (abrir modal, botão de pagamento). Sem essa
  // separação, dnd-kit intercepta o click do botão.
  return (
    <div ref={setNodeRef} style={style} {...attributes} className="relative">
      {/* Handle de arraste — bem visível, altura confortável pra touch */}
      <div
        {...listeners}
        style={{ touchAction: "none" }}
        className="flex h-8 w-full cursor-grab items-center justify-center gap-2 rounded-t-md border border-b-0 border-[var(--border)] bg-[var(--color-cream-50)] text-[var(--color-slate)] transition-colors hover:bg-[var(--color-cream)] active:cursor-grabbing active:bg-[var(--color-cream)]"
        aria-label="Arrastar pedido"
        title="Arraste para mudar de coluna"
      >
        <GripIcon />
        <span className="pointer-events-none text-[10px] font-medium uppercase tracking-widest">
          arraste
        </span>
        <GripIcon />
      </div>
      <OrderCard
        order={order}
        onOpen={onOpen}
        onMarkPaid={onMarkPaid}
        isDragging={isDragging || isActive}
      />
    </div>
  );
}

function GripIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="12"
      height="12"
      aria-hidden
      fill="currentColor"
      className="pointer-events-none opacity-60"
    >
      <circle cx="7" cy="6" r="1.4" />
      <circle cx="7" cy="10" r="1.4" />
      <circle cx="7" cy="14" r="1.4" />
      <circle cx="13" cy="6" r="1.4" />
      <circle cx="13" cy="10" r="1.4" />
      <circle cx="13" cy="14" r="1.4" />
    </svg>
  );
}
