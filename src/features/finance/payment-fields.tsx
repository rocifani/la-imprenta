"use client";
import {useState} from "react";
import {argentinaToday,methodLabels} from "./shared";
export type DepositDetails={amount:number|string;paid_on:string;method:string};
export function PaymentFields({deposit=false,initial,onAmountChange}:{deposit?:boolean;initial?:DepositDetails|null;onAmountChange?:(value:string)=>void}){
 const [amount,setAmount]=useState(initial?String(initial.amount):"");
 const prefix=deposit?"deposit_":"";
 return <><label>{deposit?"Seña recibida (opcional, ARS)":"Importe cobrado / pagado (ARS)"}<input name={prefix+"amount"} required={!deposit} inputMode="decimal" maxLength={20} value={amount} onChange={e=>{setAmount(e.target.value);onAmountChange?.(e.target.value)}} placeholder={deposit?"Dejar vacío si todavía no cobraste":"Ej.: 15000,00"}/></label>
 {(!deposit||amount.trim())&&<div className="form-row"><label>Fecha del movimiento<input type="date" name={prefix+"paid_on"} required defaultValue={initial?.paid_on??argentinaToday()} max={argentinaToday()}/></label><label>Medio de pago<select name={prefix+"method"} required defaultValue={initial?.method??"cash"}>{Object.entries(methodLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label></div>}
 {deposit&&<p className="field-help">Registrá solo dinero ya recibido. Se descuenta del saldo y aparece en el PDF de la nota.</p>}</>;
}
