import Link from "next/link";
import {getBillingOrder} from "@/features/billing/queries";
import {InvoiceForm} from "@/features/billing/invoice-form";
import {documentNumber,formatDate,formatMoney} from "@/features/sales/money";
import {formatCuit} from "@/features/sales/cuit";
import {ItemTable} from "@/features/sales/item-table";
export const metadata={title:"Facturar nota de pedido | La Imprenta"};
export default async function BillingOrderPage({params}:{params:Promise<{id:string}>}){
 const order=await getBillingOrder((await params).id);
 return <main className="business-page"><Link className="back-link" href="/panel/facturacion">← Facturación</Link><span className="eyebrow">REGISTRO MANUAL</span><h1>{documentNumber("NP",order.number)}</h1><p className="muted">Creada el {formatDate(order.created_at)}</p>
 <section className="business-card"><h2>{order.customer.name}</h2><dl className="data-grid"><div><dt>CUIT</dt><dd>{order.customer.cuit?formatCuit(order.customer.cuit):"Sin CUIT registrado"}</dd></div><div><dt>Dirección</dt><dd>{order.customer.address||"Sin dirección registrada"}</dd></div><div><dt>Contacto</dt><dd>{[order.customer.contact,order.customer.phone].filter(Boolean).join(" · ")||"Sin contacto registrado"}</dd></div><div><dt>Correo</dt><dd>{order.customer.email||"Sin correo registrado"}</dd></div></dl><p className="field-help">Estos datos corresponden al cliente al momento de crear la nota.</p><ItemTable items={order.items}/><div className="quote-total"><span>Total acordado · ARS</span><strong>{formatMoney(order.total)}</strong></div></section>
 <section className="business-card"><h2>{order.invoiced?"Facturación registrada":"Registrar facturación"}</h2>{order.invoiced?<p role="status" className="setup-note">Esta nota está marcada como facturada.{order.invoiced_at&&` Registrada el ${formatDate(order.invoiced_at)}.`}{order.invoiced_by_name&&` Por ${order.invoiced_by_name}.`}</p>:<><p className="field-help">Emití primero la factura en ARCA. Después registrá la marca aquí. Podés facturar aunque todavía haya trabajos pendientes. La facturación y los cobros se registran por separado.</p><InvoiceForm orderId={order.id}/></>}</section></main>;
}
