/**
 * Itens da sidebar do dashboard. Cada item carrega o gating por plano
 * (`plans`). O componente Sidebar filtra os itens conforme o plano da org.
 */

import type { Plan } from "@/types";

export interface NavItem {
  href: string;
  label: string;
  plans: Plan[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Visão geral",
    plans: ["basico", "full", "master"],
  },
  {
    href: "/materias-primas",
    label: "Matérias primas",
    plans: ["basico", "full", "master"],
  },
  { href: "/insumos", label: "Insumos", plans: ["basico", "full", "master"] },
  {
    href: "/fichas-tecnicas",
    label: "Fichas técnicas",
    plans: ["basico", "full", "master"],
  },
  { href: "/canais", label: "Canais de venda", plans: ["basico", "full", "master"] },
  { href: "/clientes", label: "Clientes", plans: ["basico", "full", "master"] },
  { href: "/pedidos", label: "Pedidos", plans: ["basico", "full", "master"] },
  { href: "/relatorios", label: "Relatórios", plans: ["full", "master"] },
  { href: "/financeiro", label: "Financeiro", plans: ["master"] },
  {
    href: "/configuracoes",
    label: "Configurações",
    plans: ["basico", "full", "master"],
  },
];
