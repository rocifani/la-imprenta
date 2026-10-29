import type { Order, OrderItem } from "./types";

// Proyección explícita: nunca pasar al PDF la ficha completa ni notas internas.
export function customerOrderDocument(order: Order, items: OrderItem[], money?: import("@/features/finance/shared").OrderMoney) {
  const customer = order.customer_snapshot;
  return {
    kind: "order" as const,
    workDescription: order.work_description??"",
    number: order.number,
    date: order.created_at,
    customer: {
      name: customer.display_name, contact: customer.contact_name, phone: customer.phone,
      email: customer.email, address: customer.address, cuit: customer.cuit,
    },
    items: items.map(({ description, client_description, quantity, amount }) => ({ description:client_description?.trim()||description, specifications:"", quantity, amount })),
    total: order.total,
    deposit: money?.deposit ?? 0, paid: money?.paid ?? 0, balance: money?.balance ?? Number(order.total),
  };
}

export type CustomerOrderDocument = ReturnType<typeof customerOrderDocument>;
