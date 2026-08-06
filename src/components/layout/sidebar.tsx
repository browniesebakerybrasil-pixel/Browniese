"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { NAV_ITEMS, type NavItem } from "./nav-items";
import type { Plan } from "@/types";

interface SidebarProps {
  plan: Plan;
  organizationName: string;
}

/**
 * Sidebar com comportamento responsivo.
 *  - desktop (md+): fixa a esquerda, sempre visivel
 *  - mobile: abre como drawer ao clicar no botao "Menu"
 */
export function Sidebar({ plan, organizationName }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = NAV_ITEMS.filter((i) => i.plans.includes(plan));

  return (
    <>
      {/* Botao de menu mobile */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm md:hidden"
        aria-label="Abrir menu"
      >
        Menu
      </button>

      {/* Overlay mobile */}
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-[var(--color-navy)] text-white transition-transform",
          // Desktop: nao é mais fixed. Vira sticky no topo com altura de
          // 100vh, sempre visível ao rolar, sem gap embaixo em páginas longas.
          "md:sticky md:top-0 md:h-screen md:translate-x-0 md:transform-none md:transition-none",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between p-6">
            <Link href="/dashboard" aria-label="Brownie-se — voltar ao início">
              <Logo variant="white" size="md" />
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white md:hidden"
              aria-label="Fechar menu"
            >
              X
            </button>
          </div>

          <div className="px-6 pb-4">
            <p className="text-xs uppercase tracking-widest text-white/60">
              Negócio
            </p>
            <p className="mt-1 truncate text-sm font-medium">
              {organizationName}
            </p>
            <p className="mt-1 text-xs capitalize text-[var(--color-gold)]">
              Plano {plan}
            </p>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 pb-6">
            <ul className="space-y-1">
              {items.map((item) => (
                <SidebarLink
                  key={item.href}
                  item={item}
                  active={
                    pathname === item.href ||
                    pathname?.startsWith(item.href + "/") ||
                    false
                  }
                  onClick={() => setOpen(false)}
                />
              ))}
            </ul>
          </nav>
        </div>
      </aside>
    </>
  );
}

function SidebarLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <Link
        href={item.href}
        onClick={onClick}
        className={cn(
          "block rounded-md px-3 py-2 text-sm transition-colors",
          active
            ? "bg-[var(--color-navy-700)] text-white"
            : "text-white/80 hover:bg-[var(--color-navy-600)] hover:text-white",
        )}
      >
        {item.label}
      </Link>
    </li>
  );
}
