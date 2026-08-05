-- ============================================================================
-- Brownie-se — Migration 003
-- Adiciona categoria ao pedido: comum | festival | encomenda
--
-- Uso: SQL Editor do Supabase -> cola -> Run. Idempotente.
-- ============================================================================

alter table public.orders
  add column if not exists category text not null default 'comum'
    check (category in ('comum','festival','encomenda'));

create index if not exists orders_category_idx
  on public.orders(organization_id, category);

-- FIM
