-- ============================================================================
-- Stoque — Migration 002
-- Tabela customers + ampliação de orders (cliente, entrega, pagamento, status,
-- numero sequencial).
--
-- Como rodar:
--   SQL Editor do Supabase -> cole este arquivo -> Run.
-- Idempotente: usa IF NOT EXISTS / IF EXISTS onde possivel.
-- ============================================================================

-- ----- customers ------------------------------------------------------------

create table if not exists public.customers (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  name                text not null,
  whatsapp            text,
  birthday            date,
  address             text,
  notes               text,
  order_count         integer not null default 0,
  loyalty_gift_given  boolean not null default false,
  loyalty_gift_date   date,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists customers_org_idx on public.customers(organization_id);
create index if not exists customers_org_name_idx on public.customers(organization_id, name);
create index if not exists customers_whatsapp_idx on public.customers(whatsapp);

drop trigger if exists customers_updated_at on public.customers;
create trigger customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- ----- orders: novas colunas ------------------------------------------------

-- Cliente vinculado
alter table public.orders
  add column if not exists customer_id     uuid references public.customers(id) on delete set null;
alter table public.orders
  add column if not exists customer_name   text;

-- Entrega
alter table public.orders
  add column if not exists delivery_date    date;
alter table public.orders
  add column if not exists delivery_type    text not null default 'retirada'
    check (delivery_type in ('retirada','entrega'));
alter table public.orders
  add column if not exists delivery_address text;

-- Status do pedido
alter table public.orders
  add column if not exists order_status    text not null default 'novo'
    check (order_status in (
      'novo','confirmado','em_producao','pronto','saiu','entregue','cancelado'
    ));

-- Pagamento
alter table public.orders
  add column if not exists payment_status  text not null default 'nao_pago'
    check (payment_status in ('nao_pago','sinal_pago','pago'));
alter table public.orders
  add column if not exists payment_method  text not null default 'pix'
    check (payment_method in ('pix','credito','debito','dinheiro','vale'));
alter table public.orders
  add column if not exists amount_paid     numeric(10,2) not null default 0
    check (amount_paid >= 0);

-- Numero sequencial humano (#001, #002, ...)
-- usa sequence dedicada para nao colidir com PK.
create sequence if not exists public.orders_order_number_seq;
alter table public.orders
  add column if not exists order_number    integer default nextval('public.orders_order_number_seq');

-- Backfill em linhas antigas que ficaram NULL antes do default
update public.orders
   set order_number = nextval('public.orders_order_number_seq')
 where order_number is null;

create index if not exists orders_customer_idx     on public.orders(customer_id);
create index if not exists orders_delivery_date_idx on public.orders(organization_id, delivery_date);
create index if not exists orders_status_idx       on public.orders(organization_id, order_status);
create index if not exists orders_order_number_idx on public.orders(organization_id, order_number);

-- ----- Trigger: incrementa order_count quando pedido com customer_id e criado
-- ----------------------------------------------------------------------------
-- Centralizamos a logica no app (Server Action) para evitar surpresas em
-- inserts bulk e deletes. Apenas deixamos um helper opcional aqui, comentado.
--
-- create or replace function public.bump_customer_order_count() ... ;

-- ----- RLS ------------------------------------------------------------------

alter table public.customers enable row level security;

drop policy if exists customers_owner_all on public.customers;
create policy customers_owner_all
  on public.customers
  for all
  using (
    organization_id in (
      select id from public.organizations
      where clerk_user_id = public.clerk_user_id()
    )
  )
  with check (
    organization_id in (
      select id from public.organizations
      where clerk_user_id = public.clerk_user_id()
    )
  );

-- FIM
