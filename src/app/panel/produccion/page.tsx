import {ProductionFilters} from "@/features/production/production-filters";
import {validId} from "@/features/sales/queries";
import type {CustomerOption} from "@/features/sales/customer-picker";
import Link from "next/link";
import {requireOperator,type ProductionSummary} from "@/features/production/queries";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {Pagination,listParams} from "@/features/sales/list-controls";
import {documentNumber,formatDate} from "@/features/sales/money";
export const metadata={title:"Producción | La Imprenta"};
export default async function ProductionPage({searchParams}:{searchParams:Promise<{page?:string;status?:string;assignee?:string;customer_id?:string}>}){
 await requireOperator();
 const options=await searchParams;
 const {page}=listParams(options);
 const status=["pending","completed","all"].includes(options.status??"")?options.status!:"pending";
 const assignee=["all","mine","others","unassigned"].includes(options.assignee??"")?options.assignee!:"all";
 const db=await createSupabaseServerClient();let customer:CustomerOption|null=null;let filterError="";
 if(options.customer_id){if(!validId(options.customer_id))filterError="Elegí un cliente válido.";else{const {data,error}=await db.rpc("production_customers",{p_id:options.customer_id});if(error)throw new Error("No pudimos cargar el cliente.");if(!data?.length)filterError="El cliente no tiene notas disponibles.";else customer=data[0];}}
 const {data,error}=filterError?{data:{orders:[],total:0},error:null}:await db.rpc("production_queue",{p_status:status,p_offset:(page-1)*20,p_customer_id:customer?.id??null,p_assignee:assignee});
 if(error) throw new Error("No pudimos cargar la cola de producción.");
 const queue=data as {orders:ProductionSummary[];total:number};
 return <main className="users-page"><div className="users-heading"><div><span className="eyebrow">TALLER</span><h1>Producción.</h1><p className="muted">Consultá las características de cada trabajo y registrá su finalización.</p></div></div>
 <ProductionFilters key={`${status}:${assignee}:${customer?.id??""}`} status={status} assignee={assignee} customer={customer}/>{filterError&&<p className="form-alert" role="alert">{filterError}</p>}
 <p className="results-count">{queue.total} notas de pedido</p>
 {queue.orders.length?<div className="document-list business-card">{queue.orders.map(order=><Link key={order.id} href={`/panel/produccion/${order.id}`}><span><strong>{documentNumber("NP",order.number)} · {order.customer_name}</strong><small>{formatDate(order.created_at)} · Responsable: {order.assignee_name??"Sin asignar"}</small></span><span>{order.completed_count} de {order.item_count} trabajos terminados ↗</span></Link>)}</div>:<div className="empty-team"><h2>No hay trabajos para este filtro.</h2><p>Las notas nuevas aparecen aquí con sus trabajos pendientes.</p></div>}
 <Pagination base="/panel/produccion" page={page} count={queue.total} status={status} filters={{assignee,customer_id:customer?.id??""}}/></main>;
}
