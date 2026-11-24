import { PagedSection } from "@/components/paged-section";
import { splitPages } from "./list-controls";
import Link from "next/link";
import {formatMoney,documentNumber,formatDate} from "./money";
import type {CustomerWorkSummary} from "./customer-summary";
export function CustomerSummaryView({summary}:{summary:CustomerWorkSummary}){
 return <section className="business-card"><h2>Trabajos pendientes y saldos</h2><dl className="data-grid"><div><dt>Trabajos por terminar</dt><dd>{summary.pending_count}</dd></div><div><dt>Saldo pendiente del cliente</dt><dd>{formatMoney(summary.balance)}</dd></div></dl>{(summary.credit ?? 0)>0 && <p>Saldo a favor disponible · <strong>{formatMoney(summary.credit ?? 0)}</strong></p>}<p className="field-help">Los trabajos pendientes se muestran para seguimiento interno y no generan deuda hasta terminarse.</p>
 {summary.orders.length?<PagedSection label="Trabajos y saldos del cliente" pages={splitPages(summary.orders).map((orders,index)=><div key={index}>{orders.map(order=><article className="summary-note" key={order.id}><div className="card-title-row"><h3><Link className="edit-member" href={`/panel/pedidos/${order.id}`}>{documentNumber("NP",order.number)} ↗</Link></h3><span className="pill">{order.pending_count?`${order.pending_count} trabajos pendientes`:"Trabajos terminados"}</span></div><p className="field-help">{formatDate(order.created_at)}</p>{order.items.some(item=>!item.completed)&&<ul>{order.items.filter(item=>!item.completed).map((item,index)=><li key={index}>{item.description} · Cantidad: {item.quantity.toLocaleString("es-AR")}</li>)}</ul>}<p>Importe terminado: {formatMoney(order.total)} · Cobrado: {formatMoney(order.paid)} · Cruzado con compras: {formatMoney(order.settled??0)} · <strong>Deuda exigible: {formatMoney(Math.max(order.balance,0))}</strong></p></article>)}</div>)}/>:<p>Este cliente no tiene trabajos pendientes ni saldos por cobrar.</p>}
 </section>;
}
