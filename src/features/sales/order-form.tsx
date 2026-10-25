"use client";

import { useActionState, useState } from "react";
import { createOrder } from "./actions";
import { CustomerFields } from "./customer-fields";
import { CustomerPicker, type CustomerOption } from "./customer-picker";
import type { Quote, QuoteVersion } from "./types";

export function OrderForm({ quote, version, customer, newCustomerId }: { quote: Quote; version: QuoteVersion; customer: CustomerOption | null; newCustomerId: string }) {
  const [state, action, pending] = useActionState(createOrder, {});
  const [mode, setMode] = useState("existing");
  const [selected, setSelected] = useState<CustomerOption | null>(customer);
  return <form action={action} className="business-card"><h2>Generar nota de pedido</h2><p className="field-help">Los trabajos aprobados se copiarán a la nota.</p><input type="hidden" name="id" value={quote.id} /><input type="hidden" name="version" value={quote.version} /><input type="hidden" name="new_customer_id" value={newCustomerId} />{state.error && <p role="alert" className="form-alert">{state.error}</p>}<fieldset disabled={pending} className="form-fields">
    {customer ? <><input type="hidden" name="customer_id" value={customer.id} /><p className="setup-note"><strong>Cliente: {customer.display_name}</strong><br />Se conservará el cliente asociado al presupuesto.</p></> : <><label>Cliente<select value={mode} onChange={(event) => setMode(event.target.value)}><option value="existing">Usar un cliente existente</option><option value="new">Dar de alta un cliente</option></select></label>{mode === "existing" ? <CustomerPicker value={selected} required onChange={setSelected} /> : <CustomerFields name={version.recipient_name} phone={version.recipient_phone} />}</>}
    <button className="button dark">{pending ? "Generando…" : "Generar nota de pedido"}</button></fieldset></form>;
}
