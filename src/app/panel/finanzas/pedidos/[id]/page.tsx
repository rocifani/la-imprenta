import Link from "next/link";
import {getFinanceOrder} from "@/features/finance/queries";
import {MovementForm} from "@/features/finance/movement-form";
import {MovementsTable} from "@/features/finance/movements-table";
import {documentNumber,formatDate,formatMoney} from "@/features/sales/money";
export const metadata={title:"Cobros de la nota | La Imprenta"};
export default async function FinanceOrderPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{saved?:string}>}){
 const {order,receipts}=await getFinanceOrder((await params).id);const saved=(await searchParams).saved;
 return <main className="business-page"><Link className="back-link" href="/panel/finanzas/pedidos">← Cobros y saldos</Link><h1>{documentNumber("NP",order.number)}</h1><p>{order.customer_name} · {formatDate(order.created_at)}</p>
 {saved==="1"&&<p role="status" className="success-note">Cobro registrado.</p>}{order.overdue&&<p role="status" className="form-alert">Hay saldo pendiente y pasaron 15 días o más desde la creación de la nota.</p>}
 <section className="business-card"><dl className="data-grid"><div><dt>Total acordado</dt><dd>{formatMoney(order.total)}</dd></div><div><dt>Cobrado, incluidas señas</dt><dd>{formatMoney(order.paid)}</dd></div><div><dt>Saldo pendiente</dt><dd>{formatMoney(order.balance)}</dd></div></dl></section>
 {order.balance>0&&<section className="business-card"><h2>Registrar cobro</h2><p className="field-help">Registrá un pago parcial o el saldo completo, hasta {formatMoney(order.balance)}.</p><MovementForm id={crypto.randomUUID()} orderId={order.id}/></section>}
 <section className="business-card"><h2>Historial de cobros</h2>{receipts.length?<MovementsTable movements={receipts}/>:<p>Todavía no hay cobros registrados.</p>}</section></main>;
}
