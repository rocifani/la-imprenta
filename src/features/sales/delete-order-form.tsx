"use client";
import {useActionState} from "react";
import {ConfirmedForm} from "@/components/confirmed-form";
import {deleteOrder} from "./actions";
import {documentNumber} from "./money";
export function DeleteOrderForm({id,number,revision}:{id:string;number:number;revision:number}){
 const [state,action,pending]=useActionState(deleteOrder,{});
 return <ConfirmedForm action={action} pending={pending} title={"¿Eliminar definitivamente "+documentNumber("NP",number)+"?"} description="Se borrarán esta nota, todos sus ítems, su ficha técnica y sus pases de producción. No se puede deshacer. El cliente, el presupuesto y las notas duplicadas se conservan." className="delete-order-form">
 <input type="hidden" name="order_id" value={id}/><input type="hidden" name="revision" value={revision}/><input type="hidden" name="number" value={number}/>
 {state.error&&<p role="alert" className="form-alert">{state.error}</p>}
 <button className="button danger" disabled={pending}>{pending?"Eliminando…":"Eliminar nota definitivamente"}</button></ConfirmedForm>;
}
