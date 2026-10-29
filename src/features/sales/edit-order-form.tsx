"use client";
import Link from "next/link";
import {useActionState,useState} from "react";
import {editOrder} from "./actions";
import {ProductsEditor,type EditableItem} from "./products-editor";
import {OrderWorkFields} from "@/features/production/order-work-fields";
import {formatMoney,moneyToCents} from "./money";
import type {Order,OrderItem} from "./types";
export function EditOrderForm({order,items}:{order:Order;items:OrderItem[]}){
 const [state,action,pending]=useActionState(editOrder,{});
 const [products,setProducts]=useState<EditableItem[]>(items.map(item=>({key:item.id,id:item.id,description:item.description,client_description:item.client_description,specifications:item.specifications,quantity:String(item.quantity),amount:String(item.amount)})));
 const cents=products.map(item=>moneyToCents(item.amount));
 const total=cents.every(n=>n!==null)?cents.reduce<number>((sum,n)=>sum+(n??0),0)/100:null;
 return <form action={action} className="quote-editor"><input type="hidden" name="order_id" value={order.id}/><input type="hidden" name="revision" value={order.production_revision??1}/><input type="hidden" name="items" value={JSON.stringify(products)}/>
 {state.error&&<p role="alert" className="form-alert">{state.error}</p>}
 <fieldset disabled={pending} className="form-fields"><section className="business-card"><h2>{order.customer_snapshot.display_name}</h2><p className="field-help">Se conserva el cliente de esta nota. Los cambios no modifican el presupuesto de origen.</p><OrderWorkFields description={order.work_description} sheet={order.technical_sheet}/></section>
 <ProductsEditor products={products} setProducts={setProducts} itemLabel="Ítem"/>
 <section className="business-card"><label>Observaciones internas del pedido<textarea name="order_notes" maxLength={2000} rows={3} defaultValue={order.notes}/></label><div className="quote-total"><span>Nuevo total acordado · ARS</span><strong>{total===null?"Completá los precios":formatMoney(total)}</strong></div><p className="field-help">El saldo y los PDFs reflejarán el nuevo total. Los ítems agregados quedan pendientes de producción.</p></section>
 <div className="form-actions"><button className="button dark">{pending?"Guardando…":"Guardar cambios"}</button><Link className="button secondary" href={"/panel/pedidos/"+order.id}>Cancelar</Link></div></fieldset></form>;
}
