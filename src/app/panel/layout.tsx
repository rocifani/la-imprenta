import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { getTeamAccess } from "@/features/auth/team-access";
import { signOut } from "@/features/auth/actions";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const access = await getTeamAccess();
  if (access.status !== "allowed") redirect(access.status === "denied" ? "/acceso?error=denied" : "/acceso");
  return <div className="team-panel container"><header className="panel-header"><Brand /><form action={signOut}><button className="button dark">Cerrar sesión</button></form></header><nav className="panel-nav" aria-label="Gestión interna"><Link href="/panel">Inicio</Link>{access.roles.includes("administrator") && <Link href="/panel/usuarios">Usuarios</Link>}</nav>{children}</div>;
}
