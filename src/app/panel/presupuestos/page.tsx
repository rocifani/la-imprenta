import Link from "next/link";
import { requireDesigner, validId } from "@/features/sales/queries";
import { Pagination, listParams } from "@/features/sales/list-controls";
import { documentNumber, formatDate } from "@/features/sales/money";
import { quoteDateRange } from "@/features/sales/date-range";
import { QuoteFilters } from "@/features/sales/quote-filters";
import type { CustomerOption } from "@/features/sales/customer-picker";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Presupuestos | La Imprenta" };
type Search = { page?: string; status?: string; customer_id?: string; from?: string; to?: string };

export default async function QuotesPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireDesigner();
  const options = await searchParams;
  const { page } = listParams(options);
  const status = ["draft", "approved"].includes(options.status ?? "") ? options.status! : "all";
  const customerFilter = options.customer_id ?? "";
  const from = (options.from ?? "").slice(0, 32);
  const to = (options.to ?? "").slice(0, 32);
  const dates = quoteDateRange(from, to);
  const db = await createSupabaseServerClient();
  let filterError = dates.error;
  let customer: CustomerOption | null = null;
  if (customerFilter && customerFilter !== "unassigned") {
    if (!validId(customerFilter)) filterError = "Seleccioná un cliente válido.";
    else {
      const { data, error } = await db.from("customers").select("id,display_name,phone").eq("id", customerFilter).maybeSingle();
      if (error) throw new Error("No pudimos cargar el cliente del filtro.");
      if (!data) filterError = "El cliente seleccionado ya no está disponible.";
      else customer = data;
    }
  }
  let query = db.from("quotes").select("id,number,status,revision,current_version_id,customer_id,created_at", { count: "exact" }).order("number", { ascending: false });
  if (status !== "all") query = query.eq("status", status);
  if (customerFilter === "unassigned") query = query.is("customer_id", null);
  else if (customer) query = query.eq("customer_id", customer.id);
  if (dates.start) query = query.gte("created_at", dates.start);
  if (dates.end) query = query.lt("created_at", dates.end);
  const { data: quotes, count, error } = filterError ? { data: [], count: 0, error: null } : await query.range((page - 1) * 20, page * 20 - 1);
  if (error) throw new Error("No pudimos cargar los presupuestos.");
  const { data: versions, error: versionError } = quotes?.length ? await db.from("quote_versions").select("id,recipient_name").in("id", quotes.map((quote) => quote.current_version_id)) : { data: [], error: null };
  if (versionError) throw new Error("No pudimos cargar los destinatarios.");
  const names = new Map(versions?.map((version) => [version.id, version.recipient_name]));

  return <main className="users-page">
    <div className="users-heading"><div><span className="eyebrow">GESTIÓN COMERCIAL</span><h1>Presupuestos.</h1><p className="muted">Cotizá trabajos recibidos por WhatsApp, en persona o por otro canal.</p></div><Link className="button dark" href="/panel/presupuestos/nuevo">+ Nuevo presupuesto</Link></div>
    <QuoteFilters key={`${customerFilter}:${from}:${to}:${status}`} status={status} customer={customer} customerFilter={customerFilter} from={from} to={to} />
    {filterError && <p role="alert" className="form-alert">{filterError}</p>}
    <p className="results-count">{count ?? 0} presupuestos</p>
    {quotes?.length ? <div className="users-table-wrap"><table className="users-table"><thead><tr><th scope="col">Presupuesto</th><th scope="col">Cliente / destinatario</th><th scope="col">Estado</th><th scope="col">Detalle</th></tr></thead><tbody>{quotes.map((quote) => <tr key={quote.id}><th scope="row"><strong>{documentNumber("PP", quote.number)}</strong><span className="member-email">{formatDate(quote.created_at)} · Versión {quote.revision}</span></th><td>{quote.customer_id ? <Link href={`/panel/clientes/${quote.customer_id}`} className="edit-member">{names.get(quote.current_version_id)} ↗</Link> : <>{names.get(quote.current_version_id)}<span className="member-link-status">Sin ficha de cliente</span></>}</td><td><span className={`status-badge ${quote.status === "approved" ? "active" : "inactive"}`}>{quote.status === "approved" ? "Aprobado" : "Borrador"}</span></td><td><Link className="edit-member" href={`/panel/presupuestos/${quote.id}`}>Ver ↗</Link></td></tr>)}</tbody></table></div> : !filterError && <div className="empty-team"><h2>No hay presupuestos para estos filtros.</h2><p>Creá uno nuevo o cambiá los filtros.</p><Link href="/panel/presupuestos">Limpiar filtros</Link></div>}
    <Pagination base="/panel/presupuestos" page={page} count={count ?? 0} status={status} filters={{ customer_id: customerFilter, from, to }} />
  </main>;
}
