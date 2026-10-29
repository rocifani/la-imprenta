"use client";
import Link from "next/link";
import {useState} from "react";
import {CustomerPicker,type CustomerOption} from "./customer-picker";

export function DocumentFilters({status="all",customer,customerFilter,from,to,kind="quote"}:{status?:string;kind?:"quote"|"order"|"billing";customer:CustomerOption|null;customerFilter:string;from:string;to:string}){
 const [unassigned,setUnassigned]=useState(kind==="quote"&&customerFilter==="unassigned");
 const [selected,setSelected]=useState<CustomerOption|null>(customer);
 return <form method="get" className="quote-filters business-card">
  <div className="filter-grid">
   {kind==="quote"&&<label>Estado<select name="status" defaultValue={status}><option value="all">Todos</option><option value="draft">Borradores</option><option value="approved">Aprobados</option></select></label>}
   {kind==="billing"&&<label>Estado<select name="status" defaultValue={status}><option value="all">Todas las notas</option><option value="pending">Pendientes de facturar</option><option value="invoiced">Facturadas</option></select></label>}
   {!unassigned&&<CustomerPicker value={selected} onChange={setSelected} placeholder="Todos los clientes" endpoint={kind==="billing"?"/panel/facturacion/clientes/buscar":undefined}/>}
   <label>Creado desde<input type="date" name="from" defaultValue={from}/></label>
   <label>Creado hasta<input type="date" name="to" defaultValue={to}/></label>
  </div>
  {kind==="quote"&&<label className="checkbox-row"><input type="checkbox" checked={unassigned} onChange={event=>{setUnassigned(event.target.checked);setSelected(null)}}/><span>Solo presupuestos sin ficha de cliente</span></label>}
  {unassigned&&<input type="hidden" name="customer_id" value="unassigned"/>}
  <p className="field-help">Se incluyen los días seleccionados completos, según la hora de Argentina.</p>
  <div className="form-actions"><button className="button dark">Aplicar filtros</button><Link className="button secondary" href={kind==="quote"?"/panel/presupuestos":kind==="billing"?"/panel/facturacion":"/panel/pedidos"}>Limpiar</Link></div>
 </form>;
}
