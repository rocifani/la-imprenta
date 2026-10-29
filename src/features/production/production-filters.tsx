"use client";
import Link from "next/link";
import {useState} from "react";
import {CustomerPicker,type CustomerOption} from "@/features/sales/customer-picker";
export function ProductionFilters({status,assignee,customer}:{status:string;assignee:string;customer:CustomerOption|null}){
 const [selected,setSelected]=useState(customer);
 return <form method="get" className="business-card"><div className="filter-grid">
  <label>Estado<select name="status" defaultValue={status}><option value="pending">Con trabajos pendientes</option><option value="completed">Terminadas</option><option value="all">Todas las notas</option></select></label>
  <label>Responsable<select name="assignee" defaultValue={assignee}><option value="all">Todas las asignaciones</option><option value="mine">Mis asignadas</option><option value="others">Asignadas a otros</option><option value="unassigned">Sin asignar</option></select></label>
  <CustomerPicker value={selected} onChange={setSelected} placeholder="Todos los clientes" endpoint="/panel/produccion/clientes/buscar"/>
 </div><div className="form-actions"><button className="button dark">Aplicar filtros</button><Link className="button secondary" href="/panel/produccion">Limpiar</Link></div></form>;
}
