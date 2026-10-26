"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { saveQuote } from "./actions";
import { moneyToCents, formatMoney } from "./money";
import type { Quote, QuoteItem, QuoteVersion } from "./types";
import { CustomerPicker, type CustomerOption } from "./customer-picker";
import { ProductsEditor, type EditableItem } from "./products-editor";

export function QuoteEditor({ id, quote, version, items, customer }: { id: string; quote?: Quote; version?: QuoteVersion; items?: QuoteItem[]; customer?: CustomerOption | null }) {
  const [state, action, pending] = useActionState(saveQuote, {});
  const [name, setName] = useState(version?.recipient_name ?? "");
  const [phone, setPhone] = useState(version?.recipient_phone ?? "");
  const [notes, setNotes] = useState(version?.notes ?? "");
  const [recipientMode, setRecipientMode] = useState(customer ? "existing" : "manual");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(customer ?? null);
  const [products, setProducts] = useState<EditableItem[]>(items?.map((item, index) => ({ key: String(index), description: item.description, client_description:item.client_description??item.description, technical_sheet:item.technical_sheet??{}, specifications: item.specifications, quantity: String(item.quantity), amount: String(item.amount) })) ?? [{ key: "initial", description: "", specifications: "", quantity: "1", amount: "" }]);
  const cents = products.map((item) => moneyToCents(item.amount));
  const total = cents.every((amount) => amount !== null) ? cents.reduce<number>((sum, amount) => sum + (amount ?? 0), 0) / 100 : null;
  return <form action={action} className="quote-editor"><input type="hidden" name="id" value={id} /><input type="hidden" name="version" value={quote?.version ?? ""} /><input type="hidden" name="items" value={JSON.stringify(products)} />{state.error && <p role="alert" className="form-alert">{state.error}</p>}<fieldset disabled={pending} className="form-fields">
    <section className="business-card"><h2>¿Para quién es?</h2><label>Destinatario<select value={recipientMode} onChange={(event) => { setRecipientMode(event.target.value); if (event.target.value === "existing" && selectedCustomer) { setName(selectedCustomer.display_name); setPhone(selectedCustomer.phone); } }}><option value="manual">Consulta sin ficha de cliente</option><option value="existing">Cliente existente</option></select></label>{recipientMode === "existing" ? <><CustomerPicker value={selectedCustomer} required onChange={(value) => { setSelectedCustomer(value); setName(value?.display_name ?? ""); setPhone(value?.phone ?? ""); }} /><p className="field-help">El presupuesto quedará asociado a su ficha. Nombre y teléfono se toman de ese cliente.</p><input type="hidden" name="recipient_name" value={name} /><input type="hidden" name="recipient_phone" value={phone} /></> : <><p className="field-help">Podés presupuestar sin dar de alta al cliente todavía.</p><div className="form-row"><label>Nombre o empresa<input name="recipient_name" required minLength={2} maxLength={160} value={name} onChange={(event) => setName(event.target.value)} /></label><label>Teléfono / WhatsApp (opcional)<input type="tel" name="recipient_phone" maxLength={50} value={phone} onChange={(event) => setPhone(event.target.value)} /></label></div></>}</section>
    <ProductsEditor products={products} setProducts={setProducts} />
    <section className="business-card"><label>Observaciones y condiciones para el cliente<textarea name="notes" maxLength={2000} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Condiciones acordadas y aclaraciones para este trabajo." /></label><div className="quote-total"><span>Total del presupuesto · ARS</span><strong>{total === null ? "Completá los precios" : formatMoney(total)}</strong></div></section><div className="form-actions"><button className="button dark">{pending ? "Guardando…" : "Guardar borrador"}</button><Link href={quote ? `/panel/presupuestos/${id}` : "/panel/presupuestos"} className="button secondary">Cancelar</Link></div></fieldset></form>;
}
