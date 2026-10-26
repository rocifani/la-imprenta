import Link from "next/link";
import {formatMoney,documentNumber,formatDate} from "./money";
import type {CustomerWorkSummary} from "./customer-summary";
export function CustomerSummaryView({summary}:{summary:CustomerWorkSummary}){
 return <section className="business-card"><h2>Trabajos pendientes y saldos</h2><dl className="data-grid"><div><dt>Trabajos por terminar</dt><dd>{summary.pending_count}</dd></div><div><dt>Saldo pendiente del cliente</dt><dd>{formatMoney(summary.balance)}</dd></div></dl><p className="field-help">Se incluyen trabajos pendientes aunque ya estén pagados, y notas con saldo aunque ya estén terminadas.</p>
 {summary.orders.length?summary.orders.map(order=><article className="summary-note" key={order.id}><div className="card-title-row"><h3><Link className="edit-member" href={`/panel/pedidos/${order.id}`}>{documentNumber("NP",order.number)} ↗</Link></h3><span className="pill">{order.pending_count?`${order.pending_count} trabajos pendientes`:"Trabajos terminados"}</span></div><p className="field-help">{formatDate(order.created_at)}</p>{order.items.some(item=>!item.completed)&&<ul>{order.items.filter(item=>!item.completed).map((item,index)=><li key={index}>{item.description} · Cantidad: {item.quantity.toLocaleString("es-AR")}</li>)}</ul>}<p>Total: {formatMoney(order.total)} · Cobrado: {formatMoney(order.paid)} · <strong>Saldo: {formatMoney(order.balance)}</strong></p></article>):<p>Este cliente no tiene trabajos pendientes ni saldos por cobrar.</p>}
 </section>;
}
