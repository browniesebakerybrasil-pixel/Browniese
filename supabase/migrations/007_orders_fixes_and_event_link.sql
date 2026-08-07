-- ============================================================================
-- Brownie-se — Migration 007
--
--  1) Corrige total_price em order_items (deve ser GENERATED, se por algum
--     motivo o schema original nao gravou como generated)
--  2) Adiciona event_id em orders — vincula pedido a evento pra quando a
--     categoria for "festival". Rastreamento de vendas por evento.
--
-- Uso: SQL Editor -> cola -> Run. Idempotente.
-- ============================================================================

-- ----- 1) Fix total_price em order_items ----------------------------------
-- Drop-and-recreate: se ja for GENERATED com a definicao certa nada quebra,
-- se estava como coluna normal com 0, agora vira GENERATED com backfill.
alter table public.order_items drop column if exists total_price;
alter table public.order_items
  add column total_price numeric(10,2)
    generated always as (quantity * unit_price) stored;

-- ----- 2) Vincular pedido a evento -----------------------------------------
alter table public.orders
  add column if not exists event_id uuid
    references public.events(id) on delete set null;

create index if not exists orders_event_idx
  on public.orders(organization_id, event_id);

-- FIM
