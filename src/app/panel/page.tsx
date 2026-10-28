import { redirect } from "next/navigation";
import Link from "next/link";
import { getTeamAccess, roleLabels } from "@/features/auth/team-access";

export const dynamic = "force-dynamic";
export const metadata = { title: "Panel del equipo | La Imprenta", robots: { index: false, follow: false } };

export default async function PanelPage() {
  const access = await getTeamAccess();
  if (access.status !== "allowed") redirect(access.status === "denied" ? "/acceso?error=denied" : "/acceso");
  return <main className="panel-welcome"><span className="eyebrow">ESPACIO DEL EQUIPO</span><h1>Hola, {access.member.display_name}.</h1><p>Tu acceso está habilitado.</p><div className="role-list">{access.roles.map((role) => <span className="pill" key={role}>{roleLabels[role]}</span>)}</div><div className="form-actions">{access.roles.includes("designer") && <><Link href="/panel/presupuestos/nuevo" className="button dark">Nuevo presupuesto ↗</Link><Link href="/panel/clientes" className="button secondary">Ver clientes</Link></>}{access.roles.includes("operator") && <Link href="/panel/produccion" className="button dark">Ver producción ↗</Link>}{access.roles.includes("billing") && <Link href="/panel/facturacion" className="button secondary">Ver facturación ↗</Link>}{access.roles.includes("finance") && <Link href="/panel/finanzas" className="button secondary">Ver finanzas ↗</Link>}{access.roles.includes("administrator") && <Link href="/panel/usuarios" className="button secondary">Gestionar usuarios ↗</Link>}</div>{access.roles.includes("administrator") && !access.roles.includes("designer") && <div className="setup-note"><strong>¿También vas a trabajar con clientes y presupuestos?</strong><p>Podés asignarte el rol Diseño desde Usuarios para acceder a esas herramientas.</p></div>}<div className="setup-note"><strong>La gestión sigue creciendo.</strong><p>Ya está disponible el circuito de clientes, presupuestos manuales y notas de pedido para Diseño. Producción ya permite cerrar trabajos o notas completas y dejar comentarios. Facturación permite registrar las notas ya facturadas en ARCA. Finanzas permite registrar cobros y egresos, consultar saldos y ver los atrasos.</p></div></main>;
}
