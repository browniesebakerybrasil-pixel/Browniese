/**
 * Tipos de domínio do Brownie-se.
 *
 * Espelham o schema do Supabase. Quando uma coluna é GENERATED no banco,
 * marcamos como readonly aqui para deixar claro que o cliente não escreve.
 */

import type { Unit } from "@/lib/utils";

// Re-export para que callers possam fazer `import type { Unit } from "@/types"`.
export type { Unit };

// ---------------------------------------------------------------------------
// Plano e organização
// ---------------------------------------------------------------------------

export type Plan = "basico" | "full" | "master";

export type OrganizationType =
  | "hamburgueria"
  | "confeitaria"
  | "lanchonete"
  | "restaurante"
  | "delivery"
  | "outro";

export type PlanStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete";

export interface Organization {
  id: string;
  clerk_user_id: string;
  name: string;
  type: OrganizationType | null;
  plan: Plan;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan_status: PlanStatus;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Canais de venda
// ---------------------------------------------------------------------------

export interface SalesChannel {
  id: string;
  organization_id: string;
  name: string;
  fee_percentage: number;
  is_active: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Matérias primas
// ---------------------------------------------------------------------------

export interface RawMaterial {
  id: string;
  organization_id: string;
  name: string;
  quantity: number;
  unit: Unit;
  total_cost: number;
  /** Coluna GENERATED — calculada pelo Postgres. */
  readonly cost_per_unit: number;
  waste_percentage: number;
  /** Coluna GENERATED — calculada pelo Postgres. */
  readonly effective_cost_per_unit: number;
  // migration 005 — estoque opcional
  current_stock: number | null;
  low_stock_threshold: number | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Insumos (preparos intermediários)
// ---------------------------------------------------------------------------

export interface Supply {
  id: string;
  organization_id: string;
  name: string;
  yield_quantity: number;
  yield_unit: Unit;
  notes: string | null;
  total_cost: number;
  cost_per_unit: number;
  created_at: string;
  updated_at: string;
}

export interface SupplyIngredient {
  id: string;
  supply_id: string;
  raw_material_id: string;
  quantity: number;
  unit: Unit;
  /** GENERATED — placeholder no banco. O custo real é calculado no app. */
  readonly cost: number;
  created_at: string;
}

export interface SupplyWithIngredients extends Supply {
  ingredients: Array<
    SupplyIngredient & { raw_material: RawMaterial | null }
  >;
}

// ---------------------------------------------------------------------------
// Fichas técnicas
// ---------------------------------------------------------------------------

export type IngredientType = "raw_material" | "supply";

export interface PrepStep {
  order: number;
  description: string;
}

/**
 * Item de embalagem de uma ficha técnica.
 * Ex.: { name: "Caixinha", cost: 1.50 }, { name: "Sacolinha", cost: 0.30 }.
 * O somatório vai para packaging_cost automaticamente na server action.
 */
export interface PackagingItem {
  name: string;
  cost: number;
}

/**
 * Tier de preço por canal comercial (migration 006).
 * Cada ficha pode ter varios tiers: varejo, atacado, revenda, eventos,
 * casamentos, ou o que o usuario quiser adicionar.
 *   key           identificador estavel (nao precisa ser unico entre fichas)
 *   label         nome amigavel exibido na UI
 *   target_margin margem alvo em %, usada pra calcular o preço minimo do tier
 *   price         preço praticado. Pode ser diferente do sugerido pela margem
 */
export interface PricingTier {
  key: string;
  label: string;
  target_margin: number;
  price: number;
}

export interface TechnicalSheet {
  id: string;
  organization_id: string;
  name: string;
  category: string | null;
  prep_time_minutes: number | null;
  yield_quantity: number;
  yield_unit: string;
  sale_price: number;
  desired_margin: number;

  // Custos fixos rateados
  gas_cost: number;
  energy_cost: number;
  packaging_cost: number;
  packaging_items: PackagingItem[]; // migration 004
  labor_cost: number;
  other_fixed_costs: number;

  // Estratégia comercial (migration 006)
  pricing_tiers: PricingTier[];
  absolute_min_price: number | null;

  // Calculados (persistidos para histórico/listagem)
  ingredient_cost: number;
  total_cost: number;
  cost_per_unit: number;
  cmv_percentage: number;
  markup: number;
  suggested_price: number;
  minimum_price: number;

  notes: string | null;
  prep_steps: PrepStep[];
  created_at: string;
  updated_at: string;
}

export interface SheetIngredient {
  id: string;
  sheet_id: string;
  ingredient_type: IngredientType;
  raw_material_id: string | null;
  supply_id: string | null;
  quantity: number;
  unit: Unit;
  created_at: string;
}

export interface SheetIngredientHydrated extends SheetIngredient {
  raw_material: RawMaterial | null;
  supply: Supply | null;
}

export interface TechnicalSheetWithIngredients extends TechnicalSheet {
  ingredients: SheetIngredientHydrated[];
}

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------

export type OrderStatus =
  | "novo"
  | "confirmado"
  | "em_producao"
  | "pronto"
  | "saiu"
  | "entregue"
  | "cancelado";

export type PaymentStatus = "nao_pago" | "sinal_pago" | "pago";

export type PaymentMethod =
  | "pix"
  | "credito"
  | "debito"
  | "dinheiro"
  | "vale";

export type DeliveryType = "retirada" | "entrega";

export type OrderCategory = "comum" | "festival" | "encomenda";

export interface Order {
  id: string;
  organization_id: string;
  sales_channel_id: string | null;
  order_date: string;
  order_time: string;
  total_amount: number;
  net_amount: number;
  notes: string | null;
  created_at: string;

  // novas colunas (migration 002)
  customer_id: string | null;
  customer_name: string | null;
  delivery_date: string | null;
  delivery_type: DeliveryType;
  delivery_address: string | null;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  amount_paid: number;
  order_number: number;

  // migration 003
  category: OrderCategory;
}

export interface Customer {
  id: string;
  organization_id: string;
  name: string;
  whatsapp: string | null;
  birthday: string | null;
  address: string | null;
  notes: string | null;
  order_count: number;
  loyalty_gift_given: boolean;
  loyalty_gift_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  technical_sheet_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  /** GENERATED no banco. */
  readonly total_price: number;
  created_at: string;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
  channel: SalesChannel | null;
  customer: Customer | null;
}

// ---------------------------------------------------------------------------
// Custos fixos mensais (Master)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Eventos programados (migration 005) — festivais, feiras, ocasiões
// ---------------------------------------------------------------------------

export interface EventItem {
  id: string;
  organization_id: string;
  name: string;
  event_date: string; // YYYY-MM-DD
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Histórico de ficha técnica (migration 005) — auditoria leve
// ---------------------------------------------------------------------------

export type SheetHistoryEventType =
  | "price"
  | "margin"
  | "packaging"
  | "ingredient_added"
  | "ingredient_removed"
  | "cmv";

export interface SheetHistoryEntry {
  id: string;
  organization_id: string;
  sheet_id: string;
  event_type: SheetHistoryEventType;
  from_value: string | null;
  to_value: string | null;
  description: string | null;
  changed_at: string;
}

// ---------------------------------------------------------------------------
// Custos fixos mensais (Master)
// ---------------------------------------------------------------------------

export type FixedCostCategory =
  | "aluguel"
  | "energia"
  | "gas"
  | "internet"
  | "mao_de_obra"
  | "outros";

export interface FixedCost {
  id: string;
  organization_id: string;
  name: string;
  category: FixedCostCategory | null;
  amount: number;
  /** YYYY-MM-01. */
  reference_month: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helpers de payload (insert/update)
// ---------------------------------------------------------------------------

export type Insert<T extends { id: string; created_at: string }> = Omit<
  T,
  "id" | "created_at" | "updated_at"
>;
export type Update<T> = Partial<T>;
