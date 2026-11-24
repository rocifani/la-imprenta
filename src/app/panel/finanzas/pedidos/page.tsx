import { FinanceOrderFilters } from "@/features/finance/order-filters";
import { validId } from "@/features/sales/queries";
import type { CustomerOption } from "@/features/sales/customer-picker";
import Link from "next/link";
import {requireFinance} from "@/features/finance/queries";
import type {FinanceOrder} from "@/features/finance/shared";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {Pagination,listParams} from "@/features/sales/list-controls";
import {documentNumber,formatDate,formatMoney} from "@/features/sales/money";
export const metadata={title:"Cobros y saldos | La Imprenta"};
export default async function FinanceOrdersPage({searchParams}:{searchParams:Promise<{status?:string;page?:string;customer_id?:string}>}){
 await requireFinance();const options=await searchParams;const {page}=listParams(options);const status=["all","unpaid","overdue"].includes(options.status??"")?options.status!:"unpaid";
 const db = await createSupabaseServerClient();
 const customerId = options.customer_id ?? "";
 let customer: CustomerOption | null = null;
 let filterError = "";
 if (customerId) {
   if (!validId(customerId)) filterError = "Seleccioná un cliente válido.";
   else {
     const { data, error } = await db.rpc("finance_customers", { p_id: customerId });
     if (error) throw new Error("No pudimos cargar el cliente del filtro.");
     customer = data?.[0] ?? null;
     if (!customer) filterError = "El cliente seleccionado no tiene notas disponibles.";
   }
 }
 const {data,error} = filterError ? {data:{total:0,orders:[]},error:null} : await db.rpc("finance_orders", {
   p_status: status,
   p_offset: (page - 1) * 20,
   p_customer_id: customer?.id ?? null,
 });
 if(error) throw new Error("No pudimos cargar los saldos.");
 const queue=data as {total:number;orders:FinanceOrder[]};
 return <main className="users-page"><Link className="back-link" href="/panel/finanzas">← Finanzas</Link><div className="users-heading"><h1>Cobros y saldos.</h1><Link className="button dark" href={"/panel/finanzas/clientes/cobros/nuevo" + (customer ? "?customer_id=" + customer.id : "")}>+ Cobro por cliente</Link></div><p className="field-help">El aviso de atraso aparece a los 15 días desde la creación de la nota, cuando queda saldo pendiente. No agrega recargos.</p>
 <FinanceOrderFilters key={status+customerId} status={status} customer={customer}/>{filterError&&<p role="alert" className="form-alert">{filterError}</p>}
 <p>{queue.total} notas de pedido</p>{queue.orders.length?<div className="users-table-wrap"><table className="users-table"><thead><tr><th scope="col">Nota / cliente</th><th scope="col">Importe terminado</th><th scope="col">Cobrado</th><th scope="col">Saldo</th><th scope="col">Detalle</th></tr></thead><tbody>{queue.orders.map(o=><tr key={o.id}><th scope="row">{documentNumber("NP",o.number)} · {o.customer_name}<span className="member-email">{formatDate(o.created_at)}</span>{o.overdue&&<span className="status-badge inactive">Atraso de pago</span>}</th><td className="money-cell">{formatMoney(o.total)}</td><td className="money-cell">{formatMoney(o.paid)}</td><td className="money-cell">{formatMoney(o.balance)}</td><td><Link href={`/panel/finanzas/pedidos/${o.id}`} className="edit-member">Ver cobros ↗</Link></td></tr>)}</tbody></table></div>:<div className="empty-team"><h2>No hay notas para este filtro.</h2></div>}
 <Pagination base="/panel/finanzas/pedidos" page={page} count={queue.total} status={status} filters={{customer_id:customer?.id??""}}/></main>;
}
