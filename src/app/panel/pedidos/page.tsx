import { OrderProgressBadge } from "@/features/sales/order-progress-badge";
import { DocumentFilters } from "@/features/sales/document-filters";
import { quoteDateRange } from "@/features/sales/date-range";
import type { CustomerOption } from "@/features/sales/customer-picker";
import Link from "next/link";
import { requireDesigner, validId } from "@/features/sales/queries";
import { Pagination, listParams } from "@/features/sales/list-controls";
import { documentNumber, formatDate, formatMoney } from "@/features/sales/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Order } from "@/features/sales/types";

export const metadata = { title: "Notas de pedido | La Imprenta" };
export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ page?: string; customer_id?: string; from?: string; to?: string }> }) {
  await requireDesigner();
  const options = await searchParams;
  const { page } = listParams(options);
  const customerFilter = options.customer_id ?? "";
  const from = (options.from ?? "").slice(0, 32);
  const to = (options.to ?? "").slice(0, 32);
  const dates = quoteDateRange(from, to);
  const db = await createSupabaseServerClient();
  let filterError = dates.error;
  let customer: CustomerOption | null = null;
  if (customerFilter) {
    if (!validId(customerFilter)) filterError = "Seleccioná un cliente válido.";
    else {
      const { data, error } = await db.from("customers").select("id,display_name,phone").eq("id", customerFilter).maybeSingle();
      if (error) throw new Error("No pudimos cargar el cliente del filtro.");
      if (!data) filterError = "El cliente seleccionado ya no está disponible.";
      else customer = data;
    }
  }
  let query = db.from("orders").select("*,order_items(production_status)", {count:"exact"}).order("number", {ascending:false});
  if (customer) query = query.eq("customer_id",customer.id);
  if (dates.start) query = query.gte("created_at",dates.start);
  if (dates.end) query = query.lt("created_at",dates.end);
  const {data,count,error} = filterError ? {data:[],count:0,error:null} : await query.range((page-1)*20,page*20-1);
  if (error) throw new Error("No pudimos cargar las notas de pedido.");
  const orders = data as (Order & {order_items:{production_status:"pending"|"completed"}[]})[];
  return <main className="users-page"><div className="users-heading"><div><span className="eyebrow">TRABAJOS CONFIRMADOS</span><h1>Notas de pedido.</h1><p className="muted">Trabajos confirmados, con o sin presupuesto previo.</p></div><Link className="button dark" href="/panel/pedidos/nuevo">+ Nueva nota de pedido</Link></div><DocumentFilters key={`${customerFilter}:${from}:${to}`} kind="order" customer={customer} customerFilter={customerFilter} from={from} to={to} />{filterError && <p role="alert" className="form-alert">{filterError}</p>}<p className="results-count">{count ?? 0} notas de pedido</p>{orders.length ? <div className="users-table-wrap"><table className="users-table"><caption className="visually-hidden">Notas de pedido y avance del trabajo</caption><thead><tr><th scope="col">Nota de pedido</th><th scope="col">Cliente</th><th scope="col">Estado y avance</th><th scope="col">Total · ARS</th><th scope="col">Detalle</th></tr></thead><tbody>{orders.map(order=><tr key={order.id}><th scope="row"><strong>{documentNumber("NP",order.number)}</strong><span className="member-email">{formatDate(order.created_at)}</span></th><td><Link href={`/panel/clientes/${order.customer_id}`} className="edit-member">{order.customer_snapshot.display_name}</Link></td><td><OrderProgressBadge items={order.order_items} invoiced={order.invoiced}/></td><td className="money-cell">{formatMoney(order.total)}</td><td><Link href={`/panel/pedidos/${order.id}`} className="edit-member">Ver ↗</Link></td></tr>)}</tbody></table></div> : !filterError && <div className="empty-team"><h2>No hay notas para estos filtros.</h2><p>Creá una nueva o cambiá los filtros.</p><Link href="/panel/pedidos">Limpiar filtros</Link></div>}<Pagination base="/panel/pedidos" page={page} count={count ?? 0} filters={{customer_id:customerFilter,from,to}} /></main>;
}
