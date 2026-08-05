import { z } from "zod";

/**
 * Schemas Zod usados em todas as Server Actions do Brownie-se.
 *
 * Convencao: numeros vindos de FormData chegam como string (locale pt-BR
 * pode trazer vírgula). `numberFromInput` normaliza para Number aceitando
 * `1.234,56` ou `1234.56`.
 */

const UNITS = ["g", "kg", "ml", "l", "un", "cx"] as const;
export const unitSchema = z.enum(UNITS);

export const numberFromInput = z
  .union([z.string(), z.number()])
  .transform((v) => {
    if (typeof v === "number") return v;
    const cleaned = v.trim().replace(/\./g, "").replace(",", ".");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : NaN;
  })
  .pipe(z.number({ message: "Valor numérico inválido." }));

export const positiveNumber = numberFromInput.refine((n) => n > 0, {
  message: "Deve ser maior que zero.",
});

export const nonNegativeNumber = numberFromInput.refine((n) => n >= 0, {
  message: "Não pode ser negativo.",
});

export const percent0to100 = numberFromInput.refine(
  (n) => n >= 0 && n <= 100,
  { message: "Use um valor entre 0 e 100." },
);

export const percent0to99 = numberFromInput.refine(
  (n) => n >= 0 && n < 100,
  { message: "Use um valor entre 0 e 99." },
);

// ---------------------------------------------------------------------------
// Schemas de cada modulo
// ---------------------------------------------------------------------------

/** Numero opcional que aceita string vazia -> null. Usado nos campos de
 *  estoque (current_stock, low_stock_threshold) que sao opcionais. */
const optionalNonNegative = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => {
    if (v == null) return null;
    if (typeof v === "number") return v;
    const trimmed = v.trim();
    if (!trimmed) return null;
    const n = Number(trimmed.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  })
  .refine((v) => v === null || v >= 0, {
    message: "Não pode ser negativo.",
  });

export const rawMaterialSchema = z.object({
  name: z.string().min(1, "Informe o nome.").max(120),
  quantity: positiveNumber,
  unit: unitSchema,
  total_cost: nonNegativeNumber,
  waste_percentage: percent0to100.default(0),
  current_stock: optionalNonNegative.optional(),
  low_stock_threshold: optionalNonNegative.optional(),
});

// migration 005 — eventos
export const eventSchema = z.object({
  name: z.string().min(1, "Informe o nome.").max(120),
  event_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  notes: z.string().max(500).optional(),
});

export const supplySchema = z.object({
  name: z.string().min(1).max(120),
  yield_quantity: positiveNumber,
  yield_unit: unitSchema,
  notes: z.string().max(500).optional(),
});

export const supplyIngredientSchema = z.object({
  raw_material_id: z.string().uuid(),
  quantity: positiveNumber,
  unit: unitSchema,
});

/**
 * Preprocessa `packaging_items` que chega como JSON string do form.
 * Formato: [{"name":"Caixinha","cost":1.50}, ...].
 * Filtra itens vazios/invalidos silenciosamente.
 */
const packagingItemsSchema = z.preprocess(
  (v) => {
    if (typeof v !== "string" || !v.trim()) return [];
    try {
      const parsed = JSON.parse(v);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((it: unknown) => {
          const obj = (it ?? {}) as Record<string, unknown>;
          const name = String(obj.name ?? "").trim();
          const rawCost = obj.cost;
          const cost =
            typeof rawCost === "number"
              ? rawCost
              : Number(
                  String(rawCost ?? "0")
                    .trim()
                    .replace(/\./g, "")
                    .replace(",", "."),
                );
          return {
            name,
            cost: Number.isFinite(cost) && cost >= 0 ? cost : 0,
          };
        })
        .filter((it) => it.name.length > 0);
    } catch {
      return [];
    }
  },
  z.array(
    z.object({
      name: z.string().min(1).max(60),
      cost: z.number().nonnegative(),
    }),
  ),
);

export const technicalSheetSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.string().max(80).optional(),
  prep_time_minutes: numberFromInput.optional(),
  yield_quantity: positiveNumber.default(1),
  yield_unit: z.string().min(1).max(20).default("unidades"),
  sale_price: nonNegativeNumber.default(0),
  desired_margin: percent0to99.default(0),
  gas_cost: nonNegativeNumber.default(0),
  energy_cost: nonNegativeNumber.default(0),
  packaging_cost: nonNegativeNumber.default(0),
  packaging_items: packagingItemsSchema.optional().default([]),
  labor_cost: nonNegativeNumber.default(0),
  other_fixed_costs: nonNegativeNumber.default(0),
  notes: z.string().max(500).optional(),
});

export const sheetIngredientSchema = z
  .object({
    ingredient_type: z.enum(["raw_material", "supply"]),
    raw_material_id: z.string().uuid().nullable().optional(),
    supply_id: z.string().uuid().nullable().optional(),
    quantity: positiveNumber,
    unit: unitSchema,
  })
  .refine(
    (v) =>
      (v.ingredient_type === "raw_material" && !!v.raw_material_id) ||
      (v.ingredient_type === "supply" && !!v.supply_id),
    { message: "Selecione um ingrediente." },
  );

export const salesChannelSchema = z.object({
  name: z.string().min(1).max(60),
  fee_percentage: percent0to100.default(0),
  is_active: z
    .union([z.string(), z.boolean()])
    .transform((v) => v === true || v === "on" || v === "true")
    .default(true),
});

export const orderItemSchema = z.object({
  technical_sheet_id: z.string().uuid().nullable().optional(),
  product_name: z.string().min(1).max(120),
  quantity: numberFromInput
    .refine((n) => Number.isInteger(n) && n > 0, {
      message: "Quantidade deve ser inteiro positivo.",
    }),
  unit_price: nonNegativeNumber,
});

export const orderSchema = z.object({
  sales_channel_id: z.string().uuid().nullable().optional(),
  order_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
    .optional(),
  notes: z.string().max(500).optional(),
});

export const customerSchema = z.object({
  name: z.string().min(1, "Informe o nome.").max(120),
  whatsapp: z
    .string()
    .max(40)
    .optional()
    .transform((v) => (v ? v.trim() : null)),
  birthday: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  address: z
    .string()
    .max(300)
    .optional()
    .transform((v) => (v ? v : null)),
  notes: z
    .string()
    .max(500)
    .optional()
    .transform((v) => (v ? v : null)),
});

export const orderStatusEnum = z.enum([
  "novo",
  "confirmado",
  "em_producao",
  "pronto",
  "saiu",
  "entregue",
  "cancelado",
]);

export const paymentStatusEnum = z.enum(["nao_pago", "sinal_pago", "pago"]);

export const paymentMethodEnum = z.enum([
  "pix",
  "credito",
  "debito",
  "dinheiro",
  "vale",
]);

export const deliveryTypeEnum = z.enum(["retirada", "entrega"]);

export const orderCategoryEnum = z.enum(["comum", "festival", "encomenda"]);

export const fixedCostSchema = z.object({
  name: z.string().min(1).max(120),
  category: z
    .enum(["aluguel", "energia", "gas", "internet", "mao_de_obra", "outros"])
    .nullable()
    .optional(),
  amount: nonNegativeNumber,
  reference_month: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use formato YYYY-MM-DD."),
});

// ---------------------------------------------------------------------------
// Helper para Server Actions
// ---------------------------------------------------------------------------

export type ActionState<T = unknown> = {
  ok: boolean;
  error?: string | null;
  fieldErrors?: Record<string, string[]>;
  data?: T;
};

export function emptyActionState<T>(): ActionState<T> {
  return { ok: false, error: null };
}

export function parseFormData<T extends z.ZodTypeAny>(
  schema: T,
  formData: FormData,
): ActionState<z.infer<T>> {
  const obj = Object.fromEntries(formData.entries());
  const result = schema.safeParse(obj);
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "_";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return {
      ok: false,
      error: "Verifique os campos destacados.",
      fieldErrors,
    };
  }
  return { ok: true, data: result.data };
}
