"use client";

import { Input, Select } from "@/components/ui/input";
import type { PaymentStatus } from "@/types";
import type { SalesChannel } from "@/types";

export type DateFilter = "hoje" | "semana" | "mes" | "personalizado" | "todos";

export interface FiltersState {
  dateRange: DateFilter;
  customDate: string;
  paymentStatus: "todos" | PaymentStatus;
  channelId: string;
  customerSearch: string;
}

export const defaultFilters: FiltersState = {
  dateRange: "todos",
  customDate: "",
  paymentStatus: "todos",
  channelId: "",
  customerSearch: "",
};

export function OrderFilters({
  value,
  onChange,
  channels,
}: {
  value: FiltersState;
  onChange: (v: FiltersState) => void;
  channels: SalesChannel[];
}) {
  function set<K extends keyof FiltersState>(key: K, v: FiltersState[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="grid gap-3 rounded-lg border border-[var(--border)] bg-white p-4 md:grid-cols-5">
      <div>
        <label className="text-xs uppercase tracking-widest text-[var(--color-slate)]">
          Data de entrega
        </label>
        <Select
          value={value.dateRange}
          onChange={(e) => set("dateRange", e.target.value as DateFilter)}
          className="mt-1"
        >
          <option value="todos">Todas</option>
          <option value="hoje">Hoje</option>
          <option value="semana">Esta semana</option>
          <option value="mes">Este mês</option>
          <option value="personalizado">Data específica</option>
        </Select>
      </div>

      {value.dateRange === "personalizado" ? (
        <div>
          <label className="text-xs uppercase tracking-widest text-[var(--color-slate)]">
            Escolha a data
          </label>
          <Input
            type="date"
            value={value.customDate}
            onChange={(e) => set("customDate", e.target.value)}
            className="mt-1"
          />
        </div>
      ) : null}

      <div>
        <label className="text-xs uppercase tracking-widest text-[var(--color-slate)]">
          Pagamento
        </label>
        <Select
          value={value.paymentStatus}
          onChange={(e) =>
            set("paymentStatus", e.target.value as FiltersState["paymentStatus"])
          }
          className="mt-1"
        >
          <option value="todos">Todos</option>
          <option value="nao_pago">Não pago</option>
          <option value="sinal_pago">Sinal pago</option>
          <option value="pago">Pago</option>
        </Select>
      </div>

      <div>
        <label className="text-xs uppercase tracking-widest text-[var(--color-slate)]">
          Canal
        </label>
        <Select
          value={value.channelId}
          onChange={(e) => set("channelId", e.target.value)}
          className="mt-1"
        >
          <option value="">Todos os canais</option>
          {channels.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="text-xs uppercase tracking-widest text-[var(--color-slate)]">
          Cliente
        </label>
        <Input
          type="search"
          value={value.customerSearch}
          onChange={(e) => set("customerSearch", e.target.value)}
          placeholder="Buscar por nome"
          className="mt-1"
        />
      </div>
    </div>
  );
}

/**
 * Helper para aplicar os filtros em uma lista de KanbanOrder no client.
 */
export function applyFilters<
  T extends {
    delivery_date: string | null;
    payment_status: PaymentStatus;
    customer_name: string | null;
    customer?: { name: string } | null;
    channel?: { id: string } | null;
  },
>(orders: T[], filters: FiltersState): T[] {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const startWeekStr = startOfWeek.toISOString().slice(0, 10);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  const endWeekStr = endOfWeek.toISOString().slice(0, 10);

  const monthStr = todayStr.slice(0, 7);

  return orders.filter((o) => {
    // Data de entrega
    if (filters.dateRange === "hoje" && o.delivery_date !== todayStr) {
      return false;
    }
    if (filters.dateRange === "semana") {
      if (
        !o.delivery_date ||
        o.delivery_date < startWeekStr ||
        o.delivery_date > endWeekStr
      ) {
        return false;
      }
    }
    if (filters.dateRange === "mes") {
      if (!o.delivery_date || !o.delivery_date.startsWith(monthStr)) {
        return false;
      }
    }
    if (filters.dateRange === "personalizado" && filters.customDate) {
      if (o.delivery_date !== filters.customDate) return false;
    }

    // Pagamento
    if (
      filters.paymentStatus !== "todos" &&
      o.payment_status !== filters.paymentStatus
    ) {
      return false;
    }

    // Canal
    if (filters.channelId && o.channel?.id !== filters.channelId) return false;

    // Cliente
    if (filters.customerSearch.trim()) {
      const t = filters.customerSearch.trim().toLowerCase();
      const name = (o.customer?.name ?? o.customer_name ?? "").toLowerCase();
      if (!name.includes(t)) return false;
    }

    return true;
  });
}
