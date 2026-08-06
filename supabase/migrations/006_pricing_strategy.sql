-- ============================================================================
-- Brownie-se — Migration 006
-- Estratégia comercial na ficha técnica:
--   * pricing_tiers (JSONB) — preços por canal (varejo, atacado, revenda,
--     eventos, casamentos). Cada tier tem label + target_margin + price.
--   * absolute_min_price — o "chão" absoluto do produto. Vermelho se algum
--     preço praticado ficar abaixo.
--
-- Formato de pricing_tiers:
--   [
--     {"key":"varejo","label":"Varejo","target_margin":60,"price":16.99},
--     {"key":"atacado","label":"Atacado","target_margin":30,"price":9.50}
--   ]
--
-- Uso: SQL Editor -> cola -> Run. Idempotente.
-- ============================================================================

alter table public.technical_sheets
  add column if not exists pricing_tiers jsonb not null default '[]'::jsonb;

alter table public.technical_sheets
  add column if not exists absolute_min_price numeric(10,2);

-- FIM
