import { redirect } from "next/navigation";
import Link from "next/link";
import { getTeamAccess, roleLabels } from "@/features/auth/team-access";

export const dynamic = "force-dynamic";
export const metadata = { title: "Panel del equipo | La Imprenta", robots: { index: false, follow: false } };

export default async function PanelPage() {
  const access = await getTeamAccess();
  if (access.status !== "allowed") redirect(access.status === "denied" ? "/acceso?error=denied" : "/acceso");
  return <main className="panel-welcome"><span className="eyebrow">ESPACIO DEL EQUIPO</span><h1>Hola, {access.member.display_name}.</h1><p>Tu acceso está habilitado.</p><div className="role-list">{access.roles.map((role) => <span className="pill" key={role}>{roleLabels[role]}</span>)}</div>{access.roles.includes("administrator") && <Link href="/panel/usuarios" className="button dark">Gestionar usuarios ↗</Link>}<div className="setup-note"><strong>La gestión está en desarrollo.</strong><p>Estamos preparando las herramientas de clientes, presupuestos y pedidos. Tus roles determinarán qué funciones podrás utilizar.</p></div></main>;
}
