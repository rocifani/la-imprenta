"use client";
import Link from "next/link";
import {useActionState,useState} from "react";
import {saveOrderSheet} from "./sheet-actions";
import {WorkDetailsFields} from "./technical-fields";
import type {OrderItem} from "@/features/sales/types";
export function OrderSheetEditor({orderId,revision,items}:{orderId:string;revision:number;items:OrderItem[]}){
 const [state,action,pending]=useActionState(saveOrderSheet,{});
 const [values,setValues]=useState(items.map(item=>({id:item.id,client_description:item.client_description||item.description,specifications:item.specifications,technical_sheet:item.technical_sheet??{}})));
 return <form action={action}><input type="hidden" name="order_id" value={orderId}/><input type="hidden" name="revision" value={revision}/><input type="hidden" name="items" value={JSON.stringify(values)}/>{state.error&&<p role="alert" className="form-alert">{state.error}</p>}
 <fieldset className="form-fields" disabled={pending}>{values.map((item,index)=><section key={item.id} className="business-card"><h2>{index+1}. {items[index].description}</h2><p className="field-help">Cantidad acordada: {items[index].quantity.toLocaleString("es-AR")}</p><WorkDetailsFields description={item.client_description} specifications={item.specifications} sheet={item.technical_sheet} onChange={fields=>setValues(current=>current.map(value=>value.id===item.id?{...value,...fields}:value))}/></section>)}
 <div className="form-actions"><button className="button dark">{pending?"Guardando…":"Guardar ficha de la nota"}</button><Link className="button secondary" href={`/panel/pedidos/${orderId}`}>Cancelar</Link></div></fieldset></form>;
}
