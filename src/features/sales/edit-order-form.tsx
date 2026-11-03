"use client";
import {PaymentFields,type DepositDetails} from "@/features/finance/payment-fields";
import Link from "next/link";
import {useActionState,useState} from "react";
import {editOrder} from "./actions";
import { orderItemBase, orderPricing } from "./vat";
import {ProductsEditor,type EditableItem} from "./products-editor";
import {OrderWorkFields} from "@/features/production/order-work-fields";
import {formatMoney,moneyToCents} from "./money";
import type {Order,OrderItem} from "./types";
export function EditOrderForm({order,items,deposit=null}:{order:Order;items:OrderItem[];deposit?:DepositDetails|null}){
 const [state,action,pending]=useActionState(editOrder,{});
 const [products,setProducts]=useState<EditableItem[]>(items.map(item=>({key:item.id,id:item.id,description:item.description,client_description:item.client_description,specifications:item.specifications,quantity:String(item.quantity),amount:String(orderItemBase(item)),with_vat:item.with_vat===true})));
 const [depositAmount,setDepositAmount]=useState(deposit?String(deposit.amount):"");
 const depositCents=depositAmount.trim()?moneyToCents(depositAmount):0;
 const pricing = orderPricing(products);
 const total = pricing ? pricing.total / 100 : null;
 return <form action={action} className="quote-editor"><input type="hidden" name="order_id" value={order.id}/><input type="hidden" name="revision" value={order.production_revision??1}/><input type="hidden" name="items" value={JSON.stringify(products)}/>
 {state.error&&<p role="alert" className="form-alert">{state.error}</p>}
 <fieldset disabled={pending} className="form-fields"><section className="business-card"><h2>{order.customer_snapshot.display_name}</h2><p className="field-help">Se conserva el cliente de esta nota. Los cambios no modifican el presupuesto de origen.</p><OrderWorkFields description={order.work_description} sheet={order.technical_sheet}/></section>
 <ProductsEditor products={products} setProducts={setProducts} itemLabel="Ítem" withVat/>
 <section className="business-card"><label>Observaciones internas del pedido<textarea name="order_notes" maxLength={2000} rows={3} defaultValue={order.notes}/></label>{pricing && pricing.vat > 0 && <p className="field-help">Subtotal: {formatMoney(pricing.base / 100)} · IVA: {formatMoney(pricing.vat / 100)}</p>}<div className="quote-total"><span>Nuevo total acordado · ARS</span><strong>{total===null?"Completá los precios":formatMoney(total)}</strong></div><h2>Seña recibida</h2><PaymentFields deposit initial={deposit} onAmountChange={setDepositAmount}/><p className="field-help">Podés corregir el importe, la fecha y el medio de pago. Dejá el importe vacío si la seña se cargó por error y no recibiste dinero. Se corregirá el ingreso en Finanzas al guardar.</p>{total!==null&&depositCents!==null&&<p className="field-help">Nuevo saldo: {formatMoney(total-depositCents/100)}</p>}{total!==null&&depositCents!==null&&depositCents>total*100&&<p className="form-alert" role="alert">La seña no puede superar el total de la nota.</p>}<p className="field-help">El saldo y los PDFs reflejarán el nuevo total. Los ítems agregados quedan pendientes de producción.</p></section>
 <div className="form-actions"><button className="button dark">{pending?"Guardando…":"Guardar cambios"}</button><Link className="button secondary" href={"/panel/pedidos/"+order.id}>Cancelar</Link></div></fieldset></form>;
}
