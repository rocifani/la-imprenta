"use client";
import {useActionState} from "react";
import {ConfirmedForm} from "@/components/confirmed-form";
import {markInvoiced} from "./actions";
export function InvoiceForm({orderId}:{orderId:string}){
 const [state,action,pending]=useActionState(markInvoiced,{});
 return <ConfirmedForm action={action} pending={pending} title="¿Marcar esta nota como facturada?" description="Confirmás que ya emitiste la factura en ARCA. Se guardarán tu usuario y la fecha del registro. Esta acción no registra un cobro.">
 <input type="hidden" name="order_id" value={orderId}/>{state.error&&<p role="alert" className="form-alert">{state.error}</p>}
 <button className="button dark" disabled={pending}>{pending?"Registrando…":"Marcar como facturada"}</button></ConfirmedForm>;
}
