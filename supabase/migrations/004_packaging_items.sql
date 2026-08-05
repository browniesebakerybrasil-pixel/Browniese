-- ============================================================================
-- Brownie-se — Migration 004
-- Adiciona lista de embalagens (nome + custo) por ficha técnica.
--
-- packaging_items é uma lista JSON tipo [{"name": "Caixinha", "cost": 1.50}].
-- O total soma automaticamente e é gravado em packaging_cost pelo app.
-- Backward compat: fichas antigas mantêm packaging_cost e recebem
-- packaging_items = [] ate serem editadas.
--
-- Uso: SQL Editor do Supabase -> cola -> Run. Idempotente.
-- ============================================================================

alter table public.technical_sheets
  add column if not exists packaging_items jsonb not null default '[]'::jsonb;

-- FIM
