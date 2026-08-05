-- ============================================================================
-- Stoque — Schema completo (Supabase / Postgres)
-- ============================================================================
-- Como rodar:
--   1. Abra o SQL Editor do Supabase (projeto edevkxuugttbtgciqyak)
--   2. Cole este arquivo inteiro e execute
--
-- Inclui:
--   * Extensions (uuid-ossp, pgcrypto)
--   * 11 tabelas do produto (organizations, sales_channels, raw_materials,
--     supplies, supply_ingredients, technical_sheets, sheet_ingredients,
--     orders, order_items, fixed_costs)
--   * Triggers de updated_at
--   * Indices em todas as FKs e em colunas usadas em filtros
--   * Row Level Security baseado em clerk_user_id (lido via JWT custom claim
--     `sub` do Clerk -- ver função `auth.clerk_user_id()`)
--
-- Observação sobre RLS + Clerk:
--   O Stoque usa Clerk para auth e a service role key no servidor para
--   operações que precisam ignorar RLS (webhooks, sincronização). Acessos
--   feitos pelo browser passam a anon key + JWT do Clerk via Supabase
--   Auth Helpers (third-party JWT). A função `auth.clerk_user_id()` extrai
--   o user id do JWT.
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Helper: timestamp updated_at automático
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Helper: extrai clerk user id do JWT (third-party auth)
-- -----------------------------------------------------------------------------
-- Quando configurado via Supabase Third-Party Auth (Clerk), o JWT do Clerk
-- é repassado ao Supabase e a claim `sub` contém o user id do Clerk
-- (formato `user_xxx`). Em ambientes que usam apenas service role no server,
-- as policies abaixo continuam válidas porque service role bypassa RLS.

create or replace function public.clerk_user_id()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif((current_setting('request.jwt.claims', true)::jsonb ->> 'sub'), '')
  );
$$;

-- ============================================================================
-- organizations
-- ============================================================================

create table if not exists public.organizations (
  id                      uuid primary key default gen_random_uuid(),
  clerk_user_id           text unique not null,
  name                    text not null,
  type                    text check (type in (
                            'hamburgueria', 'confeitaria', 'lanchonete',
                            'restaurante', 'delivery', 'outro'
                          )),
  plan                    text not null default 'basico'
                            check (plan in ('basico','full','master')),
  stripe_customer_id      text,
  stripe_subscription_id  text,
  plan_status             text not null default 'active'
                            check (plan_status in (
                              'active','trialing','past_due','canceled','incomplete'
                            )),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists organizations_clerk_user_id_idx
  on public.organizations(clerk_user_id);

drop trigger if exists organizations_updated_at on public.organizations;
create trigger organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- ============================================================================
-- sales_channels
-- ============================================================================

create table if not exists public.sales_channels (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  name              text not null,
  fee_percentage    numeric(5,2) not null default 0
                      check (fee_percentage >= 0 and fee_percentage <= 100),
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);

create index if not exists sales_channels_org_idx
  on public.sales_channels(organization_id);

-- ============================================================================
-- raw_materials  (matérias primas)
-- ============================================================================

create table if not exists public.raw_materials (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references public.organizations(id) on delete cascade,
  name                     text not null,
  quantity                 numeric(10,3) not null check (quantity > 0),
  unit                     text not null check (unit in ('g','kg','ml','l','un','cx')),
  total_cost               numeric(10,2) not null check (total_cost >= 0),
  cost_per_unit            numeric(10,6)
                            generated always as (total_cost / nullif(quantity, 0)) stored,
  waste_percentage         numeric(5,2) not null default 0
                            check (waste_percentage >= 0 and waste_percentage <= 100),
  effective_cost_per_unit  numeric(10,6)
                            generated always as (
                              (total_cost / nullif(quantity, 0)) *
                              (1 + waste_percentage / 100)
                            ) stored,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists raw_materials_org_idx on public.raw_materials(organization_id);
create index if not exists raw_materials_org_name_idx on public.raw_materials(organization_id, name);

drop trigger if exists raw_materials_updated_at on public.raw_materials;
create trigger raw_materials_updated_at
  before update on public.raw_materials
  for each row execute function public.set_updated_at();

-- ============================================================================
-- supplies  (insumos / preparos intermediários)
-- ============================================================================

create table if not exists public.supplies (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  name              text not null,
  yield_quantity    numeric(10,3) not null check (yield_quantity > 0),
  yield_unit        text not null check (yield_unit in ('g','kg','ml','l','un','cx')),
  notes             text,
  -- Persistido pelo app (recálculo em cascata quando matérias mudam)
  total_cost        numeric(10,2) not null default 0 check (total_cost >= 0),
  cost_per_unit     numeric(10,6) not null default 0 check (cost_per_unit >= 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists supplies_org_idx on public.supplies(organization_id);

drop trigger if exists supplies_updated_at on public.supplies;
create trigger supplies_updated_at
  before update on public.supplies
  for each row execute function public.set_updated_at();

-- ============================================================================
-- supply_ingredients
-- ============================================================================

create table if not exists public.supply_ingredients (
  id                uuid primary key default gen_random_uuid(),
  supply_id         uuid not null references public.supplies(id) on delete cascade,
  raw_material_id   uuid not null references public.raw_materials(id) on delete restrict,
  quantity          numeric(10,3) not null check (quantity > 0),
  unit              text not null check (unit in ('g','kg','ml','l','un','cx')),
  -- Coluna `cost` preservada para compatibilidade com o briefing.
  -- O custo efetivo é calculado no app (depende de unidade e desperdício).
  cost              numeric(10,6) generated always as (0) stored,
  created_at        timestamptz not null default now()
);

create index if not exists supply_ingredients_supply_idx on public.supply_ingredients(supply_id);
create index if not exists supply_ingredients_rm_idx on public.supply_ingredients(raw_material_id);

-- ============================================================================
-- technical_sheets  (fichas técnicas)
-- ============================================================================

create table if not exists public.technical_sheets (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  name                text not null,
  category            text,
  prep_time_minutes   integer check (prep_time_minutes >= 0),
  yield_quantity      numeric(10,3) not null default 1 check (yield_quantity > 0),
  yield_unit          text not null default 'unidades',
  sale_price          numeric(10,2) not null default 0 check (sale_price >= 0),
  desired_margin      numeric(5,2) not null default 0
                        check (desired_margin >= 0 and desired_margin < 100),

  -- Custos fixos rateados (informados no UI)
  gas_cost            numeric(10,2) not null default 0 check (gas_cost >= 0),
  energy_cost         numeric(10,2) not null default 0 check (energy_cost >= 0),
  packaging_cost      numeric(10,2) not null default 0 check (packaging_cost >= 0),
  labor_cost          numeric(10,2) not null default 0 check (labor_cost >= 0),
  other_fixed_costs   numeric(10,2) not null default 0 check (other_fixed_costs >= 0),

  -- Calculados pelo app e persistidos para listagens rápidas
  ingredient_cost     numeric(10,2) not null default 0,
  total_cost          numeric(10,2) not null default 0,
  cost_per_unit       numeric(10,6) not null default 0,
  cmv_percentage      numeric(5,2)  not null default 0,
  markup              numeric(10,4) not null default 0,
  suggested_price     numeric(10,2) not null default 0,
  minimum_price       numeric(10,2) not null default 0,

  notes               text,
  prep_steps          jsonb not null default '[]'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists technical_sheets_org_idx on public.technical_sheets(organization_id);
create index if not exists technical_sheets_org_name_idx on public.technical_sheets(organization_id, name);

drop trigger if exists technical_sheets_updated_at on public.technical_sheets;
create trigger technical_sheets_updated_at
  before update on public.technical_sheets
  for each row execute function public.set_updated_at();

-- ============================================================================
-- sheet_ingredients
-- ============================================================================

create table if not exists public.sheet_ingredients (
  id                  uuid primary key default gen_random_uuid(),
  sheet_id            uuid not null references public.technical_sheets(id) on delete cascade,
  ingredient_type     text not null check (ingredient_type in ('raw_material','supply')),
  raw_material_id     uuid references public.raw_materials(id) on delete restrict,
  supply_id           uuid references public.supplies(id) on delete restrict,
  quantity            numeric(10,3) not null check (quantity > 0),
  unit                text not null check (unit in ('g','kg','ml','l','un','cx')),
  created_at          timestamptz not null default now(),
  -- Garante que cada linha aponta para uma única origem coerente com o tipo
  constraint sheet_ingredients_source_check check (
    (ingredient_type = 'raw_material' and raw_material_id is not null and supply_id is null)
    or
    (ingredient_type = 'supply'       and supply_id is not null       and raw_material_id is null)
  )
);

create index if not exists sheet_ingredients_sheet_idx on public.sheet_ingredients(sheet_id);
create index if not exists sheet_ingredients_rm_idx    on public.sheet_ingredients(raw_material_id);
create index if not exists sheet_ingredients_supply_idx on public.sheet_ingredients(supply_id);

-- ============================================================================
-- orders / order_items
-- ============================================================================

create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  sales_channel_id  uuid references public.sales_channels(id) on delete set null,
  order_date        date not null default current_date,
  order_time        timestamptz not null default now(),
  total_amount      numeric(10,2) not null default 0 check (total_amount >= 0),
  net_amount        numeric(10,2) not null default 0 check (net_amount >= 0),
  notes             text,
  created_at        timestamptz not null default now()
);

create index if not exists orders_org_date_idx on public.orders(organization_id, order_date);
create index if not exists orders_channel_idx on public.orders(sales_channel_id);

create table if not exists public.order_items (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references public.orders(id) on delete cascade,
  technical_sheet_id  uuid references public.technical_sheets(id) on delete set null,
  product_name        text not null,
  quantity            integer not null default 1 check (quantity > 0),
  unit_price          numeric(10,2) not null check (unit_price >= 0),
  total_price         numeric(10,2) generated always as (quantity * unit_price) stored,
  created_at          timestamptz not null default now()
);

create index if not exists order_items_order_idx on public.order_items(order_id);

-- ============================================================================
-- fixed_costs (Master)
-- ============================================================================

create table if not exists public.fixed_costs (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  name              text not null,
  category          text check (category in (
                      'aluguel','energia','gas','internet','mao_de_obra','outros'
                    )),
  amount            numeric(10,2) not null check (amount >= 0),
  reference_month   date not null,
  created_at        timestamptz not null default now()
);

create index if not exists fixed_costs_org_month_idx on public.fixed_costs(organization_id, reference_month);

-- ============================================================================
-- Row Level Security
-- ============================================================================
--
-- Estratégia: cada tabela carrega `organization_id` (exceto as filhas, que
-- herdam via FK). A policy compara o clerk_user_id do JWT com o dono da
-- organização. Service role (server-side) bypassa RLS.

alter table public.organizations      enable row level security;
alter table public.sales_channels     enable row level security;
alter table public.raw_materials      enable row level security;
alter table public.supplies           enable row level security;
alter table public.supply_ingredients enable row level security;
alter table public.technical_sheets   enable row level security;
alter table public.sheet_ingredients  enable row level security;
alter table public.orders             enable row level security;
alter table public.order_items        enable row level security;
alter table public.fixed_costs        enable row level security;

-- organizations: dono é o próprio Clerk user
drop policy if exists organizations_owner_all on public.organizations;
create policy organizations_owner_all
  on public.organizations
  for all
  using (clerk_user_id = public.clerk_user_id())
  with check (clerk_user_id = public.clerk_user_id());

-- Helper macro: políticas baseadas em organization_id
do $$
declare
  t text;
  child_tables text[] := array[
    'sales_channels','raw_materials','supplies',
    'technical_sheets','orders','fixed_costs'
  ];
begin
  foreach t in array child_tables loop
    execute format('drop policy if exists %1$I_owner_all on public.%1$I;', t);
    execute format($f$
      create policy %1$I_owner_all
        on public.%1$I
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
    $f$, t);
  end loop;
end$$;

-- supply_ingredients: filtra via supply -> organização
drop policy if exists supply_ingredients_owner_all on public.supply_ingredients;
create policy supply_ingredients_owner_all
  on public.supply_ingredients
  for all
  using (
    supply_id in (
      select s.id from public.supplies s
      join public.organizations o on o.id = s.organization_id
      where o.clerk_user_id = public.clerk_user_id()
    )
  )
  with check (
    supply_id in (
      select s.id from public.supplies s
      join public.organizations o on o.id = s.organization_id
      where o.clerk_user_id = public.clerk_user_id()
    )
  );

-- sheet_ingredients: filtra via sheet -> organização
drop policy if exists sheet_ingredients_owner_all on public.sheet_ingredients;
create policy sheet_ingredients_owner_all
  on public.sheet_ingredients
  for all
  using (
    sheet_id in (
      select ts.id from public.technical_sheets ts
      join public.organizations o on o.id = ts.organization_id
      where o.clerk_user_id = public.clerk_user_id()
    )
  )
  with check (
    sheet_id in (
      select ts.id from public.technical_sheets ts
      join public.organizations o on o.id = ts.organization_id
      where o.clerk_user_id = public.clerk_user_id()
    )
  );

-- order_items: filtra via order -> organização
drop policy if exists order_items_owner_all on public.order_items;
create policy order_items_owner_all
  on public.order_items
  for all
  using (
    order_id in (
      select ord.id from public.orders ord
      join public.organizations o on o.id = ord.organization_id
      where o.clerk_user_id = public.clerk_user_id()
    )
  )
  with check (
    order_id in (
      select ord.id from public.orders ord
      join public.organizations o on o.id = ord.organization_id
      where o.clerk_user_id = public.clerk_user_id()
    )
  );

-- ============================================================================
-- FIM
-- ============================================================================
