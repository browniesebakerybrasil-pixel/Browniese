-- ============================================================================
-- Brownie-se — Migration 005
-- Suporte para Dashboard Executivo, módulo Inteligência e Histórico da ficha.
--
--   1) raw_materials ganha estoque atual + limite de alerta (opcionais)
--   2) tabela `events` para próximos festivais / eventos programados
--   3) tabela `sheet_history` para rastrear mudanças em fichas técnicas
--
-- Uso: SQL Editor do Supabase -> cole -> Run. Idempotente.
-- ============================================================================

-- ----- 1) Estoque em raw_materials -----------------------------------------
-- Campos opcionais. Quem preencher, aparece no bloco Alertas do dashboard
-- quando current_stock <= low_stock_threshold. Quem deixar nulo, é ignorado.
alter table public.raw_materials
  add column if not exists current_stock       numeric(10,3);

alter table public.raw_materials
  add column if not exists low_stock_threshold numeric(10,3);


-- ----- 2) Eventos programados ----------------------------------------------
-- Ex.: "Festival de Fatias", "Feira do bairro", "Dia das Mães 2026".
-- Dashboard mostra o próximo. Sem recorrência — evento simples.
create table if not exists public.events (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  name             text not null,
  event_date       date not null,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists events_org_date_idx
  on public.events(organization_id, event_date);

drop trigger if exists events_updated_at on public.events;
create trigger events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

alter table public.events enable row level security;

drop policy if exists events_owner_all on public.events;
create policy events_owner_all
  on public.events
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


-- ----- 3) Histórico de fichas técnicas -------------------------------------
-- Log leve. Cada linha = 1 mudança relevante numa ficha.
-- event_type: 'price', 'margin', 'packaging', 'ingredient_added',
--             'ingredient_removed', 'cmv'
-- from_value/to_value: texto livre pra caber qualquer formato (numeros,
-- nomes de ingredientes, etc). Foco em legibilidade, nao em consulta rica.
create table if not exists public.sheet_history (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  sheet_id         uuid not null references public.technical_sheets(id) on delete cascade,
  event_type       text not null
                    check (event_type in (
                      'price','margin','packaging',
                      'ingredient_added','ingredient_removed','cmv'
                    )),
  from_value       text,
  to_value         text,
  description      text,
  changed_at       timestamptz not null default now()
);

create index if not exists sheet_history_sheet_idx
  on public.sheet_history(sheet_id, changed_at desc);
create index if not exists sheet_history_org_idx
  on public.sheet_history(organization_id, changed_at desc);

alter table public.sheet_history enable row level security;

drop policy if exists sheet_history_owner_all on public.sheet_history;
create policy sheet_history_owner_all
  on public.sheet_history
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
