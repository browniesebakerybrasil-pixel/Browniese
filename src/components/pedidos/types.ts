import type {
  Customer,
  DeliveryType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  SalesChannel,
} from "@/types";

/**
 * Forma compacta de Order usada pelo Kanban — só os campos que aparecem nos
 * cards / filtros / modal. Inclui itens embeddados.
 */
export interface KanbanOrder {
  id: string;
  order_number: number;
  order_date: string;
  order_time: string;
  delivery_date: string | null;
  delivery_type: DeliveryType;
  delivery_address: string | null;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  total_amount: number;
  net_amount: number;
  amount_paid: number;
  notes: string | null;
  customer_id: string | null;
  customer_name: string | null;

  channel: Pick<SalesChannel, "id" | "name" | "fee_percentage"> | null;
  customer: Pick<Customer, "id" | "name" | "whatsapp" | "address"> | null;

  items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}
