import type { Quote, QuoteItem, QuoteVersion, QuoteAlternative } from "./types";

export function customerQuoteDocument(quote: Quote, version: QuoteVersion, items: QuoteItem[], alternatives?:QuoteAlternative[]) {
  return {
    kind: "quote" as const,
    number: quote.number,
    date: version.created_at,
    revision: version.revision,
    status: version.revision === quote.revision ? quote.status : "draft" as const,
    customer: {
      name: version.recipient_name, phone: version.recipient_phone,
      contact: version.recipient_contact??"", email: "", address: "", cuit: undefined as string | undefined,
    },
    alternatives:(alternatives?.length?alternatives:[{id:"",name:"Propuesta",position:1,items}]).map(option=>({name:option.name,selected:version.revision===quote.revision&&option.id===quote.selected_alternative_id,total:option.items.reduce((sum,item)=>sum+Math.round(Number(item.amount)*100),0)/100,items:option.items.map(item=>({description:item.client_description?.trim()||item.description,specifications:"",quantity:item.quantity,amount:item.amount}))})),
    items: items.map(({ description, client_description, quantity, amount }) => ({ description:client_description?.trim()||description, specifications:"", quantity, amount })),
    total: items.reduce((sum, item) => sum + Math.round(Number(item.amount) * 100), 0) / 100,
    conditions: version.notes,
  };
}

export type CustomerQuoteDocument = ReturnType<typeof customerQuoteDocument>;
