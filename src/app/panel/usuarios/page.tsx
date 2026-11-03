import { Pagination, listParams, searchTerm } from "@/features/sales/list-controls";
import { FilterForm } from "@/components/filter-form";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { memberColumns, requireAdministrator, toTeamMember } from "@/features/team/queries";
import { roleLabels } from "@/features/auth/roles";

export const metadata = { title: "Usuarios | La Imprenta" };
const pageSize = 20;

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string; notice?: string }> }) {
  await requireAdministrator();
  const params = await searchParams;
  const { page, search } = listParams(params);
  const safeSearch = searchTerm(search);
  const status = ["active", "inactive"].includes(params.status ?? "") ? params.status! : "all";
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("team_members").select(memberColumns, { count: "exact" }).order("display_name").order("id");
  if (safeSearch) query = query.or(`display_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`);
  if (status !== "all") query = query.eq("active", status === "active");
  const { data, error, count } = await query.range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw new Error("No pudimos cargar los usuarios.");
  const members = (data ?? []).map(toTeamMember);
  const notice = params.notice === "created" ? "Usuario habilitado correctamente." : params.notice === "updated" ? "Cambios guardados correctamente." : null;

  return <main className="users-page"><div className="users-heading"><div><span className="eyebrow">ADMINISTRACIÓN</span><h1>El equipo de la imprenta.</h1><p className="muted">Habilitá cuentas de Google y elegí qué puede hacer cada persona.</p></div><Link className="button dark" href="/panel/usuarios/nuevo">+ Habilitar usuario</Link></div>{notice && <p role="status" className="success-note">{notice}</p>}<FilterForm className="users-filters"><label htmlFor="search">Buscar por nombre o correo<input type="search" id="search" name="q" maxLength={100} defaultValue={search} placeholder="Nombre o correo de Google" /></label><label htmlFor="status">Estado<select id="status" name="status" defaultValue={status}><option value="all">Todos</option><option value="active">Activos</option><option value="inactive">Inactivos</option></select></label><button className="button secondary">Buscar</button>{(search || status !== "all") && <Link href="/panel/usuarios" className="clear-filter">Limpiar</Link>}</FilterForm><p className="results-count">{count ?? 0} {count === 1 ? "usuario" : "usuarios"}</p>
    {members.length ? <div className="users-table-wrap"><table className="users-table"><caption className="visually-hidden">Usuarios habilitados y sus roles</caption><thead><tr><th scope="col">Persona</th><th scope="col">Roles</th><th scope="col">Estado</th><th scope="col"><span className="visually-hidden">Acciones</span></th></tr></thead><tbody>{members.map((member) => <tr key={member.id}><th scope="row"><span className="member-name">{member.display_name}</span><span className="member-email">{member.email}</span><span className="member-link-status">{member.auth_user_id ? "Cuenta vinculada a Google" : "Todavía no ingresó"}</span></th><td><div className="table-roles">{member.roles.map((role) => <span className="pill" key={role}>{roleLabels[role]}</span>)}</div></td><td><span className={`status-badge ${member.active ? "active" : "inactive"}`}>{member.active ? "Activo" : "Inactivo"}</span></td><td><Link className="edit-member" href={`/panel/usuarios/${member.id}`} aria-label={`Editar a ${member.display_name}`}>Editar ↗</Link></td></tr>)}</tbody></table></div> : <div className="empty-team"><h2>No encontramos usuarios.</h2><p>Probá con otra búsqueda o habilitá una nueva cuenta.</p></div>}
    <Pagination base="/panel/usuarios" page={page} count={count ?? 0} search={search} status={status} />
    <p className="small muted">El rol Administrador está reservado a tu cuenta. Desactivar un acceso conserva el registro de la persona.</p></main>;
}
