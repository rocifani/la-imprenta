import Link from "next/link";
import { requireDesigner } from "@/features/sales/queries";
import { Pagination, listParams } from "@/features/sales/list-controls";
import { documentNumber, formatDate, formatMoney } from "@/features/sales/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Order } from "@/features/sales/types";

export const metadata = { title: "Notas de pedido | La Imprenta" };
export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireDesigner();
  const { page } = listParams(await searchParams);
  const db = await createSupabaseServerClient();
  const { data, count, error } = await db.from("orders").select("*", { count: "exact" }).order("number", { ascending: false }).range((page - 1) * 20, page * 20 - 1);
  if (error) throw new Error("No pudimos cargar las notas de pedido.");
  const orders = data as Order[];
  return <main className="users-page"><div className="users-heading"><div><span className="eyebrow">TRABAJOS CONFIRMADOS</span><h1>Notas de pedido.</h1><p className="muted">Trabajos generados a partir de presupuestos aprobados.</p></div><Link className="button dark" href="/panel/presupuestos">Ir a presupuestos ↗</Link></div>{orders.length ? <div className="document-list business-card">{orders.map((order) => <Link href={`/panel/pedidos/${order.id}`} key={order.id}><span><strong>{documentNumber("NP", order.number)} · {order.customer_snapshot.display_name}</strong><small>{formatDate(order.created_at)}</small></span><strong>{formatMoney(order.total)} ↗</strong></Link>)}</div> : <div className="empty-team"><h2>Todavía no hay notas de pedido.</h2><p>Primero registrá la aprobación de un presupuesto y generá su nota.</p></div>}<Pagination base="/panel/pedidos" page={page} count={count ?? 0} /></main>;
}
