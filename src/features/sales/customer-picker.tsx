"use client";

import {useEffect,useId,useRef,useState,type KeyboardEvent} from "react";
import type {Customer} from "./types";

export type CustomerOption=Pick<Customer,"id"|"display_name"|"phone">&{contact_name?:string};

type CustomerPickerProps={
 value:CustomerOption|null;
 onChange:(customer:CustomerOption|null)=>void;
 name?:string;
 required?:boolean;
 endpoint?:string;
 label?:string;
 placeholder?:string;
 entity?:"cliente"|"proveedor"|"contacto";
 emptyHint?:string;
};

export function CustomerPicker({value,onChange,name="customer_id",required=false,endpoint="/panel/clientes/buscar",label="Cliente",placeholder="Buscar por nombre o teléfono",entity="cliente",emptyHint}:CustomerPickerProps){
 const id=useId(),listId=id+"-results",helpId=id+"-help";
 const input=useRef<HTMLInputElement>(null);
 // null muestra la selección recibida; un texto representa una búsqueda sin confirmar.
 const [query,setQuery]=useState<string|null>(null);
 const [open,setOpen]=useState(false);
 const [matches,setMatches]=useState<CustomerOption[]>([]);
 const [active,setActive]=useState(-1);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [retry,setRetry]=useState(0);

 useEffect(()=>{
  input.current?.setCustomValidity(!value&&(required||query?.trim())?`Elegí un ${entity} de los resultados.`:"");
 },[value,required,query]);

 useEffect(()=>{
  if(!open)return;
  const controller=new AbortController();
  setLoading(true);setError("");setMatches([]);setActive(-1);
  const timer=setTimeout(async()=>{
   try{
    const response=await fetch(endpoint+(endpoint.includes("?")?"&":"?")+"q="+encodeURIComponent((query??"").trim()),{signal:controller.signal,cache:"no-store"});
    if(!response.ok)throw new Error("search");
    const data=await response.json();
    if(!Array.isArray(data.customers))throw new Error("search");
    if(!controller.signal.aborted){setMatches(data.customers);setActive(data.customers.length?0:-1);}
   }catch{
    if(!controller.signal.aborted)setError(`No pudimos buscar ${entity==="proveedor"?"proveedores":entity+"s"}. Podés reintentar.`);
   }finally{
    if(!controller.signal.aborted)setLoading(false);
   }
  },250);
  return()=>{clearTimeout(timer);controller.abort();};
 },[query,open,endpoint,retry]);

 useEffect(()=>{
  if(open&&active>=0)document.getElementById(listId+"-"+active)?.scrollIntoView({block:"nearest"});
 },[active,open,listId]);

 function choose(customer:CustomerOption){
  onChange(customer);setQuery(null);setOpen(false);setMatches([]);setActive(-1);
  input.current?.setCustomValidity("");
 }
 function clear(){
  onChange(null);setQuery("");setMatches([]);setActive(-1);setError("");setOpen(true);input.current?.focus();
 }
 function handleKey(event:KeyboardEvent<HTMLInputElement>){
  if(event.nativeEvent.isComposing)return;
  if(event.key==="ArrowDown"||event.key==="ArrowUp"){
   event.preventDefault();
   if(!open){setOpen(true);return;}
   if(matches.length)setActive(current=>event.key==="ArrowDown"?(current+1)%matches.length:(current<=0?matches.length-1:current-1));
  }else if(event.key==="Enter"&&open){
   event.preventDefault();if(active>=0&&matches[active])choose(matches[active]);
  }else if(event.key==="Escape"&&open){event.preventDefault();setOpen(false);}
 }
 const text=query??value?.display_name??"";
 return <div className="customer-picker" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))setOpen(false)}}>
  <input type="hidden" name={name} value={value?.id??""}/>
  <label htmlFor={id}>{label}</label>
  <div className="customer-search-field">
   <input ref={input} id={id} type="text" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={open?listId:undefined} aria-activedescendant={open&&active>=0&&matches[active]?listId+"-"+active:undefined} aria-describedby={helpId} autoComplete="off" maxLength={100} required={required} value={text} placeholder={placeholder}
    onFocus={()=>setOpen(true)}
    onChange={event=>{setQuery(event.target.value);if(value)onChange(null);setMatches([]);setActive(-1);setError("");setLoading(true);setOpen(true);}}
    onKeyDown={handleKey} onInvalid={()=>setOpen(true)}/>
   {text&&<button type="button" className="customer-picker-clear" aria-label={value?`Quitar ${entity} seleccionado`:`Limpiar búsqueda de ${entity}`} onClick={clear}>×</button>}
   {open&&<div className="customer-search-menu">
    <ul id={listId} role="listbox" aria-label={`${entity==="proveedor"?"Proveedores":entity==="contacto"?"Contactos":"Clientes"} encontrados`} aria-busy={loading}>
     {!loading&&!error&&matches.map((customer,index)=><li key={customer.id} id={listId+"-"+index} role="option" aria-selected={index===active} className={index===active?"is-active":""} onMouseDown={event=>event.preventDefault()} onMouseMove={()=>setActive(index)} onClick={()=>choose(customer)}>
      <span>{customer.display_name}</span>{customer.phone&&<small>{customer.phone}</small>}
     </li>)}
    </ul>
    {loading?<p role="status" className="customer-search-status">Buscando…</p>:error?<div className="customer-search-status"><p role="alert">{error}</p><button type="button" className="text-button" onClick={()=>setRetry(count=>count+1)}>Reintentar búsqueda</button></div>:!matches.length?<p role="status" className="customer-search-status">No encontramos resultados{query?.trim()?" para esa búsqueda":" disponibles"}.</p>:matches.length>=20?<p className="customer-search-status">Primeros 20 resultados. Escribí más para afinar la búsqueda.</p>:null}
   </div>}
  </div>
  <p id={helpId} className="field-help">{value?`${label} seleccionado. Podés quitarlo o escribir para cambiarlo.`:required?`Escribí y elegí un ${entity} de los resultados.`:emptyHint??`Escribí para elegir un ${entity}. Sin selección se incluyen todos.`}</p>
 </div>;
}
