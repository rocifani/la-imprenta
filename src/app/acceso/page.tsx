import Link from "next/link";
import { Brand } from "@/components/brand";
import { redirect } from "next/navigation";
import { getTeamAccess } from "@/features/auth/team-access";
import { signInWithGoogle, signOut } from "@/features/auth/actions";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const metadata = { title: "Acceso del equipo | La Imprenta", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

const messages: Record<string, string> = {
  signin: "No pudimos completar el ingreso. Usá una cuenta habilitada e intentá nuevamente.",
  denied: "Esta cuenta no tiene acceso al equipo. Consultá con la administradora.",
  configuration: "El ingreso con Google todavía no está configurado.",
  signout: "No pudimos cerrar la sesión. Intentá nuevamente.",
};

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const access = await getTeamAccess();
  if (access.status === "allowed") redirect("/panel");
  const { error } = await searchParams;
  const enabled = !!getSupabaseConfig() && !!process.env.APP_URL && process.env.GOOGLE_AUTH_ENABLED === "true";
  return <main className="access-page"><Brand /><section className="access-card"><span className="eyebrow">GESTIÓN INTERNA</span><h1>Hola, equipo.</h1><p>Ingresá con la cuenta de Google que habilitó la administradora de La Imprenta.</p>
    {error && messages[error] && <p role="alert" className="setup-note">{messages[error]}</p>}
    {access.status === "denied" && <form action={signOut}><p className="setup-note">Tu sesión no tiene acceso a la gestión.</p><button className="button dark full">Cerrar sesión y cambiar de cuenta</button></form>}
    {access.status !== "denied" && (enabled ? <form action={signInWithGoogle}><button className="button dark full">Ingresar con Google ↗</button></form> : <div className="setup-note"><strong>Estamos preparando el ingreso con Google.</strong><p>El acceso se habilitará cuando termine la configuración. Solo podrán ingresar las cuentas autorizadas.</p></div>)}
    <Link href="/" className="access-back">← Volver a la web</Link></section><p className="small muted">¿Sos cliente? Podés solicitar tu presupuesto sin crear una cuenta.</p></main>;
}
