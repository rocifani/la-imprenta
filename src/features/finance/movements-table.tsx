import Link from "next/link";
import {formatDate,formatMoney,documentNumber} from "@/features/sales/money";
import {methodLabels,type Movement} from "./shared";
export function MovementsTable({movements}:{movements:Movement[]}){
 return <div className="users-table-wrap"><table className="users-table"><thead><tr><th scope="col">Fecha</th><th scope="col">Movimiento</th><th scope="col">Medio</th><th scope="col">Importe</th></tr></thead><tbody>{movements.map(m=><tr key={m.id}><td>{formatDate(m.paid_on+"T12:00:00Z")}</td><td><strong>{m.kind==="expense"?"Egreso":m.kind==="deposit"?"Seña":"Cobro"}</strong>{m.order_id&&m.order_number&&<span className="member-email"><Link href={`/panel/finanzas/pedidos/${m.order_id}`}>{documentNumber("NP",m.order_number)} · {m.customer_name}</Link></span>}<p className="specification-text">{m.description}</p></td><td>{methodLabels[m.method]??m.method}</td><td className="money-cell">{m.kind==="expense"?"−":"+"}{formatMoney(m.amount)}</td></tr>)}</tbody></table></div>;
}
