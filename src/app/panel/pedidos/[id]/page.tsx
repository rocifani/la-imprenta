import Link from "next/link";
import { DownloadOrderPdf } from "@/features/sales/download-order-pdf";
import { formatCuit } from "@/features/sales/cuit";
import { getOrder } from "@/features/sales/queries";
import { documentNumber, formatDate, formatMoney } from "@/features/sales/money";
import { ItemTable } from "@/features/sales/item-table";

export const metadata = { title: "Nota de pedido | La Imprenta" };
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { order, items } = await getOrder((await params).id);
  const customer = order.customer_snapshot;
  return <main className="business-page"><Link className="back-link" href="/panel/pedidos">← Notas de pedido</Link><span className="eyebrow">TRABAJO CONFIRMADO</span><h1>{documentNumber("NP", order.number)}</h1><p className="muted">Creada el {formatDate(order.created_at)} · A partir de un presupuesto aprobado.</p><DownloadOrderPdf id={order.id} number={order.number} /><section className="business-card"><div className="card-title-row"><h2>{customer.display_name}</h2><Link className="edit-member" href={`/panel/clientes/${order.customer_id}`}>Ficha del cliente ↗</Link></div><p>{customer.contact_name}{customer.phone && ` · ${customer.phone}`}</p>{customer.cuit && <p>CUIT: {formatCuit(customer.cuit)}</p>}{customer.address && <p>{customer.address}</p>}<ItemTable items={items} /><div className="quote-total"><span>Total acordado · ARS</span><strong>{formatMoney(order.total)}</strong></div>{order.notes && <p className="specification-text">{order.notes}</p>}</section><p className="field-help">Los datos del cliente y los productos conservan lo acordado al generar esta nota. Los controles de avance del operario y el registro de facturación se incorporarán en las siguientes etapas.</p><Link className="button secondary" href={`/panel/presupuestos/${order.quote_id}`}>Ver presupuesto de origen ↗</Link></main>;
}
