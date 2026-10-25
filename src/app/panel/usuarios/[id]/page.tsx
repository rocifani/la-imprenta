import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { memberColumns, requireAdministrator, toTeamMember } from "@/features/team/queries";
import { MemberForm } from "@/features/team/member-form";

export const metadata = { title: "Editar usuario | La Imprenta" };

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdministrator();
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("team_members").select(memberColumns).eq("id", id).maybeSingle();
  if (error) throw new Error("No pudimos cargar el usuario.");
  if (!data) notFound();
  return <main className="member-page"><Link href="/panel/usuarios" className="back-link">← Volver al equipo</Link><span className="eyebrow">GESTIÓN DE ACCESO</span><h1>Editar usuario.</h1><p className="muted">Los cambios de roles y estado se aplican al guardar.</p><MemberForm member={toTeamMember(data)} /></main>;
}
