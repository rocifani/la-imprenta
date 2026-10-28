"use client";
import Link from "next/link";
import {useState} from "react";
import {CustomerPicker,type CustomerOption} from "@/features/sales/customer-picker";
export function ProductionFilters({status,assignee,customer}:{status:string;assignee:string;customer:CustomerOption|null}){
 const [mode,setMode]=useState(customer?"customer":"all"),[selected,setSelected]=useState(customer);
 return <form method="get" className="business-card"><div className="filter-grid"><label>Estado<select name="status" defaultValue={status}><option value="pending">Con trabajos pendientes</option><option value="completed">Terminadas</option><option value="all">Todas las notas</option></select></label><label>Responsable<select name="assignee" defaultValue={assignee}><option value="all">Todas las asignaciones</option><option value="mine">Mis asignadas</option><option value="others">Asignadas a otros</option><option value="unassigned">Sin asignar</option></select></label><label>Cliente<select value={mode} onChange={e=>setMode(e.target.value)}><option value="all">Todos los clientes</option><option value="customer">Seleccionar cliente</option></select></label></div>{mode==="customer"&&<CustomerPicker value={selected} onChange={setSelected} required endpoint="/panel/produccion/clientes/buscar"/>}<div className="form-actions"><button className="button dark">Aplicar filtros</button><Link className="button secondary" href="/panel/produccion">Limpiar</Link></div></form>;
}
