import Link from "next/link";
import { requireDesigner } from "@/features/sales/queries";
import { Pagination, listParams, searchTerm } from "@/features/sales/list-controls";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Clientes | La Imprenta" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  await requireDesigner();
  const { page, search } = listParams(await searchParams);
  const db = await createSupabaseServerClient();
  let query = db.from("customers").select("id,display_name,contact_name,phone,email", { count: "exact" }).order("display_name").order("id");
  const term = searchTerm(search);
  if (term) query = query.or(`display_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`);
  const { data, count, error } = await query.range((page - 1) * 20, page * 20 - 1);
  if (error) throw new Error("No pudimos cargar los clientes.");
  return <main className="users-page"><div className="users-heading"><div><span className="eyebrow">GESTIÓN COMERCIAL</span><h1>Clientes.</h1><p className="muted">Contactos e historial de pedidos en un mismo lugar.</p></div><Link className="button dark" href="/panel/clientes/nuevo">+ Nuevo cliente</Link></div><form className="users-filters" method="get"><label>Buscar por nombre, teléfono o correo<input type="search" name="q" maxLength={100} defaultValue={search} /></label><button className="button secondary">Buscar</button>{search && <Link href="/panel/clientes">Limpiar</Link>}</form><p className="results-count">{count ?? 0} clientes</p>{data?.length ? <div className="users-table-wrap"><table className="users-table"><thead><tr><th scope="col">Cliente</th><th scope="col">Contacto</th><th scope="col">Ficha</th></tr></thead><tbody>{data.map((customer) => <tr key={customer.id}><th scope="row"><strong>{customer.display_name}</strong><span className="member-email">{customer.contact_name}</span></th><td>{customer.phone || "Sin teléfono"}<span className="member-email">{customer.email}</span></td><td><Link className="edit-member" href={`/panel/clientes/${customer.id}`}>Ver ficha ↗</Link></td></tr>)}</tbody></table></div> : <div className="empty-team"><h2>No encontramos clientes.</h2><p>Podés dar de alta uno o ajustar la búsqueda.</p></div>}<Pagination base="/panel/clientes" page={page} count={count ?? 0} search={search} /></main>;
}
