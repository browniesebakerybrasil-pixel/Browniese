import type { OrderStatus, PaymentStatus, PaymentMethod } from "@/types";

/**
 * Cor de cada coluna do Kanban. Usada na barra superior, no título e na
 * borda do card durante o drag-and-drop.
 */
export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  novo: "#0C3C59",       // navy
  confirmado: "#D9A441", // âmbar
  em_producao: "#AD7039", // laranja queimado
  pronto: "#2D9E75",     // verde
  saiu: "#4A6572",       // slate / roxo-acinzentado
  entregue: "#94A3AF",   // cinza
  cancelado: "#B91C1C",  // vermelho
};

export const ORDER_COLUMNS: Array<{
  status: OrderStatus;
  label: string;
  hint: string;
}> = [
  { status: "novo", label: "Novo", hint: "acabou de chegar" },
  { status: "confirmado", label: "Confirmado", hint: "cliente confirmou" },
  { status: "em_producao", label: "Em produção", hint: "cozinha começou" },
  { status: "pronto", label: "Pronto", hint: "aguardando saída/retirada" },
  { status: "saiu", label: "Saiu para entrega", hint: "motoboy a caminho" },
  { status: "entregue", label: "Entregue", hint: "concluído" },
  { status: "cancelado", label: "Cancelado", hint: "" },
];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  novo: "Novo",
  confirmado: "Confirmado",
  em_producao: "Em produção",
  pronto: "Pronto",
  saiu: "Saiu para entrega",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  nao_pago: "Não pago",
  sinal_pago: "Sinal pago",
  pago: "Pago",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  pix: "Pix",
  credito: "Crédito",
  debito: "Débito",
  dinheiro: "Dinheiro",
  vale: "Vale",
};

export const PAYMENT_BADGE: Record<PaymentStatus, string> = {
  nao_pago: "bg-red-100 text-red-800 border-red-300",
  sinal_pago: "bg-amber-100 text-amber-900 border-amber-300",
  pago: "bg-emerald-100 text-emerald-800 border-emerald-300",
};
