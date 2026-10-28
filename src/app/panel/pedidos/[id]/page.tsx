import {TechnicalSheetView} from "@/features/production/technical-sheet-view";
import { OrderProgressBadge } from "@/features/sales/order-progress-badge";
import Link from "next/link";
import { OrderActions } from "@/features/sales/order-actions";
import { formatCuit } from "@/features/sales/cuit";
import { getOrder } from "@/features/sales/queries";
import { documentNumber, formatDate, formatMoney } from "@/features/sales/money";
import { ItemTable } from "@/features/sales/item-table";

export const metadata = { title: "Nota de pedido | La Imprenta" };
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { order, items, money } = await getOrder((await params).id);
  const customer = order.customer_snapshot;
  return <main className="business-page"><Link className="back-link" href="/panel/pedidos">← Notas de pedido</Link><span className="eyebrow">TRABAJO CONFIRMADO</span><h1>{documentNumber("NP", order.number)}</h1><p className="muted">Creada el {formatDate(order.created_at)} · {order.quote_id ? "A partir de un presupuesto aprobado." : "Creada directamente, sin presupuesto previo."}</p><OrderProgressBadge items={items} invoiced={order.invoiced}/><OrderActions id={order.id} number={order.number}/><section className="business-card"><div className="card-title-row"><h2>{customer.display_name}</h2><Link className="edit-member" href={`/panel/clientes/${order.customer_id}`}>Ficha del cliente ↗</Link></div><p>{customer.contact_name}{customer.phone && ` · ${customer.phone}`}</p>{customer.cuit && <p>CUIT: {formatCuit(customer.cuit)}</p>}{customer.address && <p>{customer.address}</p>}<ItemTable items={items} /><dl className="data-grid"><div><dt>Seña recibida</dt><dd>{formatMoney(money.deposit)}</dd></div><div><dt>Total cobrado</dt><dd>{formatMoney(money.paid)}</dd></div><div><dt>Saldo pendiente</dt><dd>{formatMoney(money.balance)}</dd></div></dl><div className="quote-total"><span>Total acordado · ARS</span><strong>{formatMoney(order.total)}</strong></div>{order.notes && <p className="specification-text">{order.notes}</p>}</section><section className="business-card"><h2>Fichas de producción</h2>{items.map(item=><div key={item.id}><h3>{item.description}</h3><p className="field-help">Para el cliente: {item.client_description||item.description}</p><TechnicalSheetView sheet={item.technical_sheet}/></div>)}</section><p className="field-help">Los datos del cliente y los trabajos conservan lo acordado al generar esta nota. El operario registra la finalización y sus comentarios desde Producción. El rol Facturación registra la marca manual después de emitir la factura en ARCA.</p>{order.quote_id && <Link className="button secondary" href={`/panel/presupuestos/${order.quote_id}`}>Ver presupuesto de origen ↗</Link>}</main>;
}
