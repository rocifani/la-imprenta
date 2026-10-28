import {DocumentFilters} from "@/features/sales/document-filters";
import {quoteDateRange} from "@/features/sales/date-range";
import {validId} from "@/features/sales/queries";
import type {CustomerOption} from "@/features/sales/customer-picker";
import Link from "next/link";
import {requireBilling,type BillingSummary} from "@/features/billing/queries";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {Pagination,listParams} from "@/features/sales/list-controls";
import {documentNumber,formatDate,formatMoney} from "@/features/sales/money";
export const metadata={title:"Facturación | La Imprenta"};
export default async function BillingPage({searchParams}:{searchParams:Promise<{page?:string;status?:string;customer_id?:string;from?:string;to?:string}>}){
 await requireBilling();const options=await searchParams;const {page}=listParams(options);
 const status=["pending","invoiced","all"].includes(options.status??"")?options.status!:"all";
 const customerFilter=options.customer_id??"";
 const from=(options.from??"").slice(0,32),to=(options.to??"").slice(0,32);
 const dates=quoteDateRange(from,to);
 let filterError=dates.error;
 let customer:CustomerOption|null=null;
 const db=await createSupabaseServerClient();
 if(customerFilter){
  if(!validId(customerFilter)) filterError="Seleccioná un cliente válido.";
  else{
   const {data,error}=await db.rpc("billing_customers",{p_id:customerFilter});
   if(error) throw new Error("No pudimos cargar el cliente del filtro.");
   if(!data?.length) filterError="El cliente seleccionado no tiene notas disponibles.";
   else customer=data[0];
  }
 }
 const {data,error}=filterError?{data:{orders:[],total:0},error:null}:await db.rpc("billing_queue",{p_status:status,p_offset:(page-1)*20,p_customer_id:customer?.id??null,p_from:dates.start??null,p_until:dates.end??null});
 if(error) throw new Error("No pudimos cargar las notas para facturar.");
 const queue=data as {orders:BillingSummary[];total:number};
 return <main className="users-page"><div className="users-heading"><div><span className="eyebrow">REGISTRO MANUAL</span><h1>Facturación.</h1><p className="muted">Facturá en ARCA y registrá aquí las notas facturadas.</p></div></div>
 <DocumentFilters key={`${status}:${customerFilter}:${from}:${to}`} kind="billing" status={status} customer={customer} customerFilter={customerFilter} from={from} to={to}/>
 {filterError&&<p role="alert" className="form-alert">{filterError}</p>}
 <p className="results-count">{queue.total} notas de pedido</p>
 {queue.orders.length?<div className="users-table-wrap"><table className="users-table"><caption className="visually-hidden">Notas y estado de facturación</caption><thead><tr><th scope="col">Nota</th><th scope="col">Cliente</th><th scope="col">Estado</th><th scope="col">Total · ARS</th><th scope="col">Detalle</th></tr></thead><tbody>{queue.orders.map(order=><tr key={order.id}><th scope="row">{documentNumber("NP",order.number)}<span className="member-email">{formatDate(order.created_at)}</span></th><td>{order.customer_name}</td><td><span className={`status-badge ${order.invoiced?"active":"inactive"}`}>{order.invoiced?"Facturada":"Pendiente de facturar"}</span><span className="member-email">{order.completed_count} de {order.item_count} trabajos terminados</span></td><td className="money-cell">{formatMoney(order.total)}</td><td><Link className="edit-member" href={`/panel/facturacion/${order.id}`}>Ver ↗</Link></td></tr>)}</tbody></table></div>:!filterError&&<div className="empty-team"><h2>No hay notas para estos filtros.</h2><p>Cambiá o limpiá los filtros para ver otras notas.</p></div>}
 <Pagination base="/panel/facturacion" page={page} count={queue.total} status={status} filters={{customer_id:customerFilter,from,to}}/></main>;
}
