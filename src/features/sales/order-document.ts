import type { Order, OrderItem } from "./types";

// Proyección explícita: nunca pasar al PDF la ficha completa ni notas internas.
export function customerOrderDocument(order: Order, items: OrderItem[]) {
  const customer = order.customer_snapshot;
  return {
    kind: "order" as const,
    number: order.number,
    date: order.created_at,
    customer: {
      name: customer.display_name, contact: customer.contact_name, phone: customer.phone,
      email: customer.email, address: customer.address, cuit: customer.cuit,
    },
    items: items.map(({ description, specifications, quantity, amount }) => ({ description, specifications, quantity, amount })),
    total: order.total,
  };
}

export type CustomerOrderDocument = ReturnType<typeof customerOrderDocument>;
