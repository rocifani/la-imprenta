"use client";
import {useState} from "react";
import {TechnicalFields} from "./technical-fields";
import type {TechnicalSheet} from "./technical-sheet";

export function OrderWorkFields({description="",sheet={}}:{description?:string;sheet?:TechnicalSheet}) {
 const [value,setValue]=useState(description);
 const [technicalSheet,setTechnicalSheet]=useState(sheet);
 return <div className="order-work-fields">
  <h2>Trabajo general de la nota</h2>
  <p className="field-help">Describí el trabajo una sola vez. Abajo se detallan sus ítems, modelos o variantes.</p>
  <label>Descripción general del trabajo<textarea name="work_description" maxLength={2000} rows={3} value={value} onChange={event=>setValue(event.target.value)} placeholder="Ej.: Imanes promocionales con distintas figuras: delfines, tortugas y otros modelos."/></label>
  <input type="hidden" name="order_technical_sheet" value={JSON.stringify(technicalSheet)}/>
  <p className="field-help">La descripción general aparece en el PDF del cliente. Esta ficha técnica es común a todos los ítems y solo la ve el equipo.</p>
  <TechnicalFields value={technicalSheet} onChange={setTechnicalSheet}/>
 </div>;
}
