import Link from "next/link";
import { requireAdministrator } from "@/features/team/queries";
import { MemberForm } from "@/features/team/member-form";

export const metadata = { title: "Habilitar usuario | La Imprenta" };

export default async function NewMemberPage() {
  await requireAdministrator();
  return <main className="member-page"><Link href="/panel/usuarios" className="back-link">← Volver al equipo</Link><span className="eyebrow">NUEVO ACCESO</span><h1>Sumá una persona al equipo.</h1><p className="muted">Ingresá su correo exacto de Google y asignale sus roles.</p><MemberForm /></main>;
}
