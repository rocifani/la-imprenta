import {CompletedSummaryView} from "@/features/sales/completed-summary-view";
import {CustomerSummaryView} from "@/features/sales/customer-summary-view";
import {getCompletedCustomerSummary,getCustomerWorkSummary} from "@/features/sales/queries";
import Link from "next/link";
import { formatCuit } from "@/features/sales/cuit";
import { getCustomer } from "@/features/sales/queries";
import { Pagination, listParams } from "@/features/sales/list-controls";
import { documentNumber, formatDate, formatMoney } from "@/features/sales/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Ficha del cliente | La Imprenta" };
export default async function CustomerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string; saved?: string }> }) {
  const customer = await getCustomer((await params).id);
  const options = await searchParams;
  const { page } = listParams(options);
  const db = await createSupabaseServerClient();
  const { data: orders, count, error } = await db.from("orders").select("id,number,total,created_at", { count: "exact" }).eq("customer_id", customer.id).order("number", { ascending: false }).range((page - 1) * 20, page * 20 - 1);
  if (error) throw new Error("No pudimos cargar el historial.");
  const {data:money,error:moneyError}=await db.rpc("customer_money",{p_customer_id:customer.id});
  if(moneyError) throw new Error("No pudimos cargar el saldo del cliente.");
  const [summary,completedSummary]=await Promise.all([getCustomerWorkSummary(customer.id),getCompletedCustomerSummary(customer.id)]);
  return <main className="users-page"><Link className="back-link" href="/panel/clientes">← Clientes</Link><div className="users-heading"><div><span className="eyebrow">FICHA DEL CLIENTE</span><h1>{customer.display_name}</h1></div><Link className="button secondary" href={`/panel/clientes/${customer.id}/editar`}>Editar datos</Link></div>{options.saved === "1" && <p role="status" className="success-note">Datos guardados correctamente.</p>}<section className="business-card"><h2>Contacto</h2><dl className="data-grid"><div><dt>CUIT</dt><dd>{formatCuit(customer.cuit)}</dd></div><div><dt>Persona de contacto</dt><dd>{customer.contact_name || "Sin indicar"}</dd></div><div><dt>Teléfono / WhatsApp</dt><dd>{customer.phone || "Sin indicar"}</dd></div><div><dt>Correo</dt><dd>{customer.email || "Sin indicar"}</dd></div><div><dt>Dirección</dt><dd>{customer.address || "Sin indicar"}</dd></div></dl>{customer.notes && <p className="specification-text">{customer.notes}</p>}</section><div className="form-actions"><Link className="button dark" href={`/panel/presupuestos/nuevo?customer_id=${customer.id}`}>Nuevo presupuesto</Link><Link className="button secondary" href={`/panel/presupuestos?customer_id=${customer.id}`}>Ver presupuestos del cliente ↗</Link></div><CompletedSummaryView summary={completedSummary}/><CustomerSummaryView summary={summary}/><section className="business-card"><h2>Historial de pedidos</h2>{orders?.length ? <><div className="document-list">{orders.map((order) => <div className="history-order" key={order.id}><Link href={`/panel/pedidos/${order.id}`}><span><strong>{documentNumber("NP", order.number)}</strong><small>{formatDate(order.created_at)}</small></span><strong>{formatMoney(order.total)} ↗</strong></Link><Link className="button secondary" href={`/panel/pedidos/nuevo?duplicate_from=${order.id}`}>Duplicar nota</Link></div>)}</div><Pagination base={`/panel/clientes/${customer.id}`} page={page} count={count ?? 0} /></> : <p className="muted">Todavía no hay pedidos asociados a este cliente.</p>}</section><section className="business-card"><h2>Cobros y saldo</h2><dl className="data-grid"><div><dt>Total acordado</dt><dd>{formatMoney(money.total)}</dd></div><div><dt>Total cobrado, incluidas señas</dt><dd>{formatMoney(money.paid)}</dd></div><div><dt>Saldo pendiente</dt><dd>{formatMoney(money.balance)}</dd></div></dl></section></main>;
}
