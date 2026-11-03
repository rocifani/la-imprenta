"use client";
import {OrderWorkFields} from "@/features/production/order-work-fields";
import {PaymentFields} from "@/features/finance/payment-fields";

import { useActionState, useState } from "react";
import {AssigneeField} from "@/features/production/assignee-field";
import type {ProductionMember} from "@/features/production/team";
import { createOrder } from "./actions";
import { CustomerFields } from "./customer-fields";
import { CustomerPicker, type CustomerOption } from "./customer-picker";
import { formatMoney } from "./money";
import { orderPricing } from "./vat";
import type { Quote, QuoteItem, QuoteVersion } from "./types";

export function OrderForm({ quote, version, customer, newCustomerId,members=[],items=[] }: {items?:QuoteItem[];members?:ProductionMember[]; quote: Quote; version: QuoteVersion; customer: CustomerOption | null; newCustomerId: string }) {
  const [state, action, pending] = useActionState(createOrder, {});
  const [mode, setMode] = useState("existing");
  const [selected, setSelected] = useState<CustomerOption | null>(customer);
  const [vatItems, setVatItems] = useState(() => items.map(() => false));
  const pricing = orderPricing(items.map((item, index) => ({ amount: String(item.amount), with_vat: vatItems[index] })));
  return <form action={action} className="business-card"><h2>Generar nota de pedido</h2><p className="field-help">Los trabajos aprobados se copiarán a la nota.</p><input type="hidden" name="id" value={quote.id} /><input type="hidden" name="version" value={quote.version} /><input type="hidden" name="new_customer_id" value={newCustomerId} />{state.error && <p role="alert" className="form-alert">{state.error}</p>}<fieldset disabled={pending} className="form-fields">
    {customer ? <><input type="hidden" name="customer_id" value={customer.id} /><p className="setup-note"><strong>Cliente: {customer.display_name}</strong><br />Se conservará el cliente asociado al presupuesto.</p></> : <><label>Cliente<select value={mode} onChange={(event) => setMode(event.target.value)}><option value="existing">Usar un cliente existente</option><option value="new">Dar de alta un cliente</option></select></label>{mode === "existing" ? <CustomerPicker value={selected} required onChange={setSelected} /> : <CustomerFields name={version.recipient_name} phone={version.recipient_phone} />}</>}
    <OrderWorkFields/><AssigneeField members={members}/>{items.length > 0 && <div>
      <p className="field-help">El IVA se suma a los precios aprobados de los ítems marcados.</p>
      <input type="hidden" name="vat_items" value={vatItems.map(value => value ? "1" : "0").join("")} />
      <label className="checkbox-row"><input type="checkbox" checked={vatItems.every(Boolean)} onChange={event => {
        const checked = event.target.checked;
        setVatItems(items.map(() => checked));
      }} /><span>Con IVA (21 %) en toda la nota</span></label>
      {items.map((item, index) => <label className="checkbox-row" key={index}>
        <input type="checkbox" checked={vatItems[index]} onChange={event => {
          const checked = event.target.checked;
          setVatItems(current => current.map((value, i) => i === index ? checked : value));
        }} /><span>{item.description} · Con IVA (21 %)</span>
      </label>)}
      {pricing && <p>Subtotal: {formatMoney(pricing.base / 100)} · IVA: {formatMoney(pricing.vat / 100)} · Total: {formatMoney(pricing.total / 100)}</p>}
    </div>}<PaymentFields deposit/><button className="button dark">{pending ? "Generando…" : "Generar nota de pedido"}</button></fieldset></form>;
}
