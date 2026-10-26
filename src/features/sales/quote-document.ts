import type { Quote, QuoteItem, QuoteVersion } from "./types";

export function customerQuoteDocument(quote: Quote, version: QuoteVersion, items: QuoteItem[]) {
  return {
    kind: "quote" as const,
    number: quote.number,
    date: version.created_at,
    revision: version.revision,
    status: version.revision === quote.revision ? quote.status : "draft" as const,
    customer: {
      name: version.recipient_name, phone: version.recipient_phone,
      contact: "", email: "", address: "", cuit: undefined as string | undefined,
    },
    items: items.map(({ description, client_description, quantity, amount }) => ({ description:client_description?.trim()||description, specifications:"", quantity, amount })),
    total: items.reduce((sum, item) => sum + Math.round(Number(item.amount) * 100), 0) / 100,
    conditions: version.notes,
  };
}

export type CustomerQuoteDocument = ReturnType<typeof customerQuoteDocument>;
