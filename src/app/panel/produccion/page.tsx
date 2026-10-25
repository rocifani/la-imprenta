import Link from "next/link";
import {requireOperator,type ProductionSummary} from "@/features/production/queries";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {Pagination,listParams} from "@/features/sales/list-controls";
import {documentNumber,formatDate} from "@/features/sales/money";
export const metadata={title:"Producción | La Imprenta"};
export default async function ProductionPage({searchParams}:{searchParams:Promise<{page?:string;status?:string}>}){
 await requireOperator();
 const options=await searchParams;
 const {page}=listParams(options);
 const status=["pending","completed","all"].includes(options.status??"")?options.status!:"pending";
 const db=await createSupabaseServerClient();
 const {data,error}=await db.rpc("production_queue",{p_status:status,p_offset:(page-1)*20});
 if(error) throw new Error("No pudimos cargar la cola de producción.");
 const queue=data as {orders:ProductionSummary[];total:number};
 return <main className="users-page"><div className="users-heading"><div><span className="eyebrow">TALLER</span><h1>Producción.</h1><p className="muted">Consultá las características de cada trabajo y registrá su finalización.</p></div></div>
 <form method="get" className="business-card"><label>Estado<select name="status" defaultValue={status}><option value="pending">Con trabajos pendientes</option><option value="completed">Terminadas</option><option value="all">Todas las notas</option></select></label><button className="button dark">Aplicar filtro</button></form>
 <p className="results-count">{queue.total} notas de pedido</p>
 {queue.orders.length?<div className="document-list business-card">{queue.orders.map(order=><Link key={order.id} href={`/panel/produccion/${order.id}`}><span><strong>{documentNumber("NP",order.number)} · {order.customer_name}</strong><small>{formatDate(order.created_at)}</small></span><span>{order.completed_count} de {order.item_count} trabajos terminados ↗</span></Link>)}</div>:<div className="empty-team"><h2>No hay trabajos para este filtro.</h2><p>Las notas nuevas aparecen aquí con sus trabajos pendientes.</p></div>}
 <Pagination base="/panel/produccion" page={page} count={queue.total} status={status}/></main>;
}
