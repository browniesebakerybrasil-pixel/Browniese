import Link from "next/link";
import { LoyaltyProgress } from "./loyalty-progress";
import type { Customer } from "@/types";

export function CustomerCard({ customer }: { customer: Customer }) {
  return (
    <Link
      href={`/clientes/${customer.id}`}
      className="block rounded-lg border border-[var(--border)] bg-white p-4 transition-colors hover:border-[var(--color-navy)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-[var(--color-navy)]">
            {customer.name}
          </p>
          {customer.whatsapp ? (
            <p className="mt-1 text-xs text-[var(--color-slate)]">
              {customer.whatsapp}
            </p>
          ) : null}
        </div>
        <span className="shrink-0 rounded-full bg-[var(--color-cream-50)] px-2 py-1 text-xs text-[var(--color-slate)]">
          {customer.order_count} pedidos
        </span>
      </div>
      <div className="mt-3">
        <LoyaltyProgress
          count={customer.order_count}
          giftGiven={customer.loyalty_gift_given}
          size="sm"
        />
      </div>
    </Link>
  );
}
