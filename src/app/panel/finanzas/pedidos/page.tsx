import Link from "next/link";
import {requireFinance} from "@/features/finance/queries";
import type {FinanceOrder} from "@/features/finance/shared";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {Pagination,listParams} from "@/features/sales/list-controls";
import {documentNumber,formatDate,formatMoney} from "@/features/sales/money";
export const metadata={title:"Cobros y saldos | La Imprenta"};
export default async function FinanceOrdersPage({searchParams}:{searchParams:Promise<{status?:string;page?:string}>}){
 await requireFinance();const options=await searchParams;const {page}=listParams(options);const status=["all","unpaid","overdue"].includes(options.status??"")?options.status!:"unpaid";
 const db=await createSupabaseServerClient();const {data,error}=await db.rpc("finance_orders",{p_status:status,p_offset:(page-1)*20});if(error)throw new Error("No pudimos cargar los saldos.");
 const queue=data as {total:number;orders:FinanceOrder[]};
 return <main className="users-page"><Link className="back-link" href="/panel/finanzas">← Finanzas</Link><h1>Cobros y saldos.</h1><p className="field-help">El aviso de atraso aparece a los 15 días desde la creación de la nota, cuando queda saldo pendiente. No agrega recargos.</p>
 <form method="get" className="business-card"><label>Estado<select name="status" defaultValue={status}><option value="unpaid">Con saldo pendiente</option><option value="overdue">Atrasos: 15 días o más</option><option value="all">Todas las notas</option></select></label><button className="button dark">Aplicar filtro</button></form>
 <p>{queue.total} notas de pedido</p>{queue.orders.length?<div className="users-table-wrap"><table className="users-table"><thead><tr><th scope="col">Nota / cliente</th><th scope="col">Total</th><th scope="col">Cobrado</th><th scope="col">Saldo</th><th scope="col">Detalle</th></tr></thead><tbody>{queue.orders.map(o=><tr key={o.id}><th scope="row">{documentNumber("NP",o.number)} · {o.customer_name}<span className="member-email">{formatDate(o.created_at)}</span>{o.overdue&&<span className="status-badge inactive">Atraso de pago</span>}</th><td className="money-cell">{formatMoney(o.total)}</td><td className="money-cell">{formatMoney(o.paid)}</td><td className="money-cell">{formatMoney(o.balance)}</td><td><Link href={`/panel/finanzas/pedidos/${o.id}`} className="edit-member">Ver cobros ↗</Link></td></tr>)}</tbody></table></div>:<div className="empty-team"><h2>No hay notas para este filtro.</h2></div>}
 <Pagination base="/panel/finanzas/pedidos" page={page} count={queue.total} status={status}/></main>;
}
