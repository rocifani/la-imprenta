"use client";
import {OrderWorkFields} from "@/features/production/order-work-fields";
import type {TechnicalSheet} from "@/features/production/technical-sheet";

import {PaymentFields} from "@/features/finance/payment-fields";
import {AssigneeField} from "@/features/production/assignee-field";
import type {ProductionMember} from "@/features/production/team";
import type {OrderItem} from "./types";
import Link from "next/link";
import {useActionState,useState} from "react";
import {createDirectOrder} from "./actions";
import {CustomerFields} from "./customer-fields";
import {CustomerPicker,type CustomerOption} from "./customer-picker";
import { orderItemBase, orderPricing } from "./vat";
import {ProductsEditor,type EditableItem} from "./products-editor";
import {formatMoney} from "./money";
export function DirectOrderForm({id,newCustomerId,customer,members=[],items,notes="",sourceOrderId,workDescription="",technicalSheet={}}:{id:string;newCustomerId:string;customer:CustomerOption|null;members?:ProductionMember[];items?:OrderItem[];notes?:string;sourceOrderId?:string;workDescription?:string;technicalSheet?:TechnicalSheet}) {
 const [state,action,pending]=useActionState(createDirectOrder,{});
 const [mode,setMode]=useState("existing");
 const [selected,setSelected]=useState(customer);
 const [products,setProducts]=useState<EditableItem[]>(items?.map((item,index)=>({key:String(index),description:item.description,client_description:item.client_description,technical_sheet:item.technical_sheet,specifications:item.specifications,quantity:String(item.quantity),amount:String(orderItemBase(item)),with_vat:item.with_vat===true}))??[{key:"initial",description:"",specifications:"",quantity:"1",amount:""}]);
 const pricing = orderPricing(products);
 const total = pricing ? pricing.total / 100 : null;
 return <form action={action} className="quote-editor">
 <input type="hidden" name="source_order_id" value={sourceOrderId??""}/><input type="hidden" name="id" value={id}/><input type="hidden" name="new_customer_id" value={newCustomerId}/><input type="hidden" name="items" value={JSON.stringify(products)}/>
 {state.error && <p role="alert" className="form-alert">{state.error}</p>}
 <fieldset disabled={pending} className="form-fields">
 <section className="business-card"><h2>Cliente</h2><label>Ficha del cliente<select value={mode} onChange={e=>setMode(e.target.value)}><option value="existing">Usar un cliente existente</option><option value="new">Dar de alta un cliente</option></select></label>{mode==="existing"?<CustomerPicker value={selected} required onChange={setSelected}/>:<CustomerFields/>}</section>
 <section className="business-card"><AssigneeField members={members}/></section><section className="business-card"><OrderWorkFields description={workDescription} sheet={technicalSheet}/></section><ProductsEditor products={products} setProducts={setProducts} itemLabel="Ítem" withVat/>
 <section className="business-card"><label>Observaciones internas del pedido<textarea name="order_notes" maxLength={2000} rows={3} defaultValue={notes}/></label>{pricing && pricing.vat > 0 && <p className="field-help">Subtotal: {formatMoney(pricing.base / 100)} · IVA: {formatMoney(pricing.vat / 100)}</p>}<div className="quote-total"><span>Total acordado · ARS</span><strong>{total===null?"Completá los precios":formatMoney(total)}</strong></div><PaymentFields deposit/><label className="checkbox-row"><input type="checkbox" name="confirmed" required/><span>Confirmo que el trabajo y el precio fueron acordados con el cliente.</span></label><p className="field-help">La nota se crea como trabajo confirmado, con sus trabajos pendientes de producción.</p></section>
 <div className="form-actions"><button className="button dark">{pending?"Creando…":"Crear nota de pedido"}</button><Link className="button secondary" href="/panel/pedidos">Cancelar</Link></div>
 </fieldset></form>;
}
