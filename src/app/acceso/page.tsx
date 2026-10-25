import Link from "next/link";
import { Brand } from "@/components/brand";

export const metadata = { title: "Acceso del equipo | La Imprenta", robots: { index: false, follow: false } };

export default function AccessPage() {
  return <main className="access-page"><Brand /><section className="access-card"><span className="eyebrow">GESTIÓN INTERNA</span><h1>Hola, equipo.</h1><p>Este espacio es para las personas habilitadas por la administradora de La Imprenta.</p><div className="setup-note"><strong>El acceso todavía no está habilitado.</strong><p>Estamos preparando el ingreso con Google. No se están solicitando credenciales ni creando cuentas en esta etapa.</p></div><Link href="/" className="button dark full">Volver a la web ↗</Link></section><p className="small muted">¿Sos cliente? Podés solicitar tu presupuesto sin crear una cuenta.</p></main>;
}
