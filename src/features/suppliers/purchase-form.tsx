"use client";
import {useActionState,useState} from "react";
import {ConfirmedForm} from "@/components/confirmed-form";
import {CustomerPicker,type CustomerOption} from "@/features/sales/customer-picker";
import {PaymentFields} from "@/features/finance/payment-fields";
import {argentinaToday} from "@/features/finance/shared";
import {recordPurchase} from "./actions";
export function PurchaseForm({id,initialSupplier}:{id:string;initialSupplier:CustomerOption|null}){
 const [supplier,setSupplier]=useState(initialSupplier),[pay,setPay]=useState(false);const [state,action,pending]=useActionState(recordPurchase,{});
 return <ConfirmedForm action={action} pending={pending} title="¿Registrar esta compra?" description="Se registrará la compra y se cruzarán los saldos disponibles. Si cargás un pago, también se registrará la salida de dinero."><input type="hidden" name="id" value={id}/>{state.error&&<p className="form-alert" role="alert">{state.error}</p>}<fieldset className="form-fields" disabled={pending}><CustomerPicker entity="proveedor" label="Proveedor" name="supplier_id" endpoint="/panel/proveedores/buscar" value={supplier} onChange={setSupplier} required/><label>Fecha de compra<input type="date" name="purchased_on" required defaultValue={argentinaToday()} max={argentinaToday()}/></label><label>Descripción de la compra<textarea name="description" required minLength={2} maxLength={1000} rows={3} placeholder="Ej.: Papel ilustración o servicio de impresión"/></label><div className="form-row"><label>Importe total de la compra (ARS)<input name="amount" required inputMode="decimal" maxLength={20} placeholder="Ej.: 15000,00"/></label><label>Comprobante o referencia (opcional)<input name="reference" maxLength={120}/></label></div><label className="checkbox-row"><input type="checkbox" name="pay_now" checked={pay} onChange={e=>setPay(e.target.checked)}/>Registrar un pago de esta compra ahora</label>{pay&&<PaymentFields fieldPrefix="payment_" label="Importe pagado ahora (ARS)"/>}<button className="button dark">{pending?"Guardando…":"Registrar compra"}</button></fieldset></ConfirmedForm>;
}
