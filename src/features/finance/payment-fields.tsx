"use client";
import {useState} from "react";
import {argentinaToday,methodLabels} from "./shared";
export function PaymentFields({deposit=false}:{deposit?:boolean}){
 const [amount,setAmount]=useState("");
 const prefix=deposit?"deposit_":"";
 return <><label>{deposit?"Seña recibida (opcional, ARS)":"Importe cobrado / pagado (ARS)"}<input name={prefix+"amount"} required={!deposit} inputMode="decimal" maxLength={20} value={amount} onChange={e=>setAmount(e.target.value)} placeholder={deposit?"Dejar vacío si todavía no cobraste":"Ej.: 15000,00"}/></label>
 {(!deposit||amount.trim())&&<div className="form-row"><label>Fecha del movimiento<input type="date" name={prefix+"paid_on"} required defaultValue={argentinaToday()} max={argentinaToday()}/></label><label>Medio de pago<select name={prefix+"method"} required>{Object.entries(methodLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label></div>}
 {deposit&&<p className="field-help">Registrá solo dinero ya recibido. Se descuenta del saldo y aparece en el PDF de la nota.</p>}</>;
}
