"use client";
import { formatMoney } from "./money";
import { orderPricing } from "./vat";
import {WorkDetailsFields} from "@/features/production/technical-fields";
import type {TechnicalSheet} from "@/features/production/technical-sheet";
import type { Dispatch, SetStateAction } from "react";
export type EditableItem = { key: string; id?: string; with_vat?: boolean; client_description?: string; technical_sheet?: TechnicalSheet; description: string; specifications: string; quantity: string; amount: string };
export function ProductsEditor({products,setProducts,itemLabel="Trabajo",withVat=false}:{products:EditableItem[];setProducts:Dispatch<SetStateAction<EditableItem[]>>;itemLabel?:"Trabajo"|"Ítem";withVat?:boolean}) {
 function change(key:string,field:keyof Omit<EditableItem,"key">,value:string|boolean){setProducts(current=>current.map(item=>item.key===key?{...item,[field]:value}:item));}
 return <section className="business-card"><div className="card-title-row"><h2>{itemLabel==="Ítem"?"Ítems de la nota":"Trabajos"}</h2><span className="pill">{products.length} / 50</span></div>{withVat && <label className="checkbox-row">
    <input type="checkbox" checked={products.every(item => item.with_vat)} onChange={event => {
      const checked = event.target.checked;
      setProducts(current => current.map(item => ({ ...item, with_vat: checked })));
    }} />
    <span>Con IVA (21 %) en toda la nota</span>
  </label>}
  <p className="field-help">{withVat ? "Ingresá el precio sin IVA de cada lote. El IVA se suma solo a los ítems marcados." : "Cargá el precio final de cada lote en pesos argentinos, incluidos impuestos si corresponden."} No se multiplica nuevamente por la cantidad.</p>{products.map((item, index) => {
    const pricing = withVat && item.with_vat ? orderPricing([item]) : null;
    return <fieldset className="quote-product" key={item.key}><legend>{itemLabel} {index + 1}</legend><label>{itemLabel==="Ítem"?"Nombre del ítem / modelo":"Nombre del trabajo"}<input required minLength={2} maxLength={180} placeholder="Ej.: Folletos para promoción" value={item.description} onChange={(event) => change(item.key, "description", event.target.value)} /></label><WorkDetailsFields description={item.client_description??item.description} specifications={item.specifications} sheet={item.technical_sheet??{}} onChange={fields=>setProducts(current=>current.map(product=>product.key===item.key?{...product,...fields}:product))}/><div className="form-row"><label>Cantidad<input required type="number" min={1} max={10000000} step={1} value={item.quantity} onChange={(event) => change(item.key, "quantity", event.target.value)} /></label><label>{withVat ? "Precio del lote sin IVA (ARS)" : "Precio total del lote (ARS)"}<input required type="text" inputMode="decimal" maxLength={20} placeholder="Ej.: 96400,00" value={item.amount} onChange={(event) => change(item.key, "amount", event.target.value)} /></label></div>{withVat && <label className="checkbox-row">
    <input type="checkbox" checked={!!item.with_vat} onChange={event => change(item.key, "with_vat", event.target.checked)} />
    <span>Con IVA (21 %)</span>
  </label>}
  {pricing && <p className="field-help">
    IVA: {formatMoney(pricing.vat / 100)} · Total: {formatMoney(pricing.total / 100)}
  </p>}{products.length > 1 && <button type="button" className="text-button" onClick={() => setProducts((current) => current.filter((product) => product.key !== item.key))}>Quitar {itemLabel.toLowerCase()} {index + 1}</button>}</fieldset>;
  })}<button type="button" className="button secondary" disabled={products.length >= 50} onClick={() => setProducts((current) => [...current, { key: crypto.randomUUID(), description: "", specifications: "", quantity: "1", amount: "", with_vat: withVat && current.every(item => item.with_vat) }])}>+ Agregar {itemLabel.toLowerCase()}</button></section>;
}
