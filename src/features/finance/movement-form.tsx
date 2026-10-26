"use client";
import {useActionState} from "react";
import {ConfirmedForm} from "@/components/confirmed-form";
import {PaymentFields} from "./payment-fields";
import {recordMovement} from "./actions";
export function MovementForm({id,orderId}:{id:string;orderId?:string}){
 const [state,action,pending]=useActionState(recordMovement,{});
 return <ConfirmedForm action={action} pending={pending} title={orderId?"¿Registrar este cobro?":"¿Registrar este egreso?"} description="Confirmás que el dinero ya fue cobrado o pagado. Revisá el importe y la fecha antes de guardar.">
 <input type="hidden" name="id" value={id}/>{orderId&&<input type="hidden" name="order_id" value={orderId}/>}
 {state.error&&<p className="form-alert" role="alert">{state.error}</p>}
 <fieldset className="form-fields" disabled={pending}><PaymentFields/>
 <label>{orderId?"Comentario (opcional)":"Compra o gasto realizado"}<textarea name="description" rows={2} required={!orderId} minLength={orderId?undefined:2} maxLength={500} placeholder={orderId?"Ej.: Pago parcial por transferencia":"Ej.: Compra de papel ilustración o servicio de impresión"}/></label>
 <button className="button dark">{pending?"Guardando…":orderId?"Registrar cobro":"Registrar egreso"}</button></fieldset></ConfirmedForm>;
}
