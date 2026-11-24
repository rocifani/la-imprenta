"use client";
import {useActionState,useState} from "react";
import {CustomerPicker,type CustomerOption} from "@/features/sales/customer-picker";
import {ConfirmedForm} from "@/components/confirmed-form";
import {PaymentFields} from "./payment-fields";
import {recordMovement} from "./actions";
export function MovementForm({id,orderId,initialSupplier=null}:{id:string;orderId?:string;initialSupplier?:CustomerOption|null}){
 const [supplier,setSupplier]=useState(initialSupplier);
 const [state,action,pending]=useActionState(recordMovement,{});
 return <ConfirmedForm action={action} pending={pending} title={orderId?"¿Registrar este cobro?":supplier?"¿Registrar este pago al proveedor?":"¿Registrar este egreso?"} description="Confirmás que el dinero ya fue cobrado o pagado. Revisá el importe y la fecha antes de guardar.">
 <input type="hidden" name="id" value={id}/>{orderId&&<input type="hidden" name="order_id" value={orderId}/>}
 {state.error&&<p className="form-alert" role="alert">{state.error}</p>}
 <fieldset className="form-fields" disabled={pending}>{!orderId&&<CustomerPicker entity="proveedor" label="Proveedor (opcional)" emptyHint="Sin proveedor, se registra un egreso genérico." name="supplier_id" endpoint="/panel/proveedores/buscar" value={supplier} onChange={setSupplier}/>}<PaymentFields label={orderId?"Importe cobrado (ARS)":"Importe pagado (ARS)"}/>
 <label>{orderId?"Comentario (opcional)":supplier?"Concepto del pago":"Compra o gasto realizado"}<textarea name="description" rows={2} required={!orderId} minLength={orderId?undefined:2} maxLength={500} placeholder={orderId?"Ej.: Pago parcial por transferencia":"Ej.: Compra de papel ilustración o servicio de impresión"}/></label>
 <button className="button dark">{pending?"Guardando…":orderId?"Registrar cobro":supplier?"Registrar pago al proveedor":"Registrar egreso"}</button></fieldset></ConfirmedForm>;
}
