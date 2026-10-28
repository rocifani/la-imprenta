import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { isTeamRole } from "./roles";
export { roleLabels } from "./roles";

export async function getTeamAccess() {
  if (!getSupabaseConfig()) return { status: "unconfigured" as const };
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { status: "anonymous" as const };
  const { data: member, error } = await supabase.from("team_members")
    .select("id, display_name, email")
    .eq("auth_user_id", user.id).eq("active", true).maybeSingle();
  if (error) throw new Error("No pudimos verificar el acceso. Intentá nuevamente.");
  if (!member) return { status: "denied" as const };
  const { data: assignments, error: rolesError } = await supabase.from("team_member_roles")
    .select("role").eq("member_id", member.id);
  if (rolesError) throw new Error("No pudimos verificar tus roles. Intentá nuevamente.");
  const roles = (assignments ?? []).map((assignment) => assignment.role).filter(isTeamRole);
  if (!roles.length) return { status: "denied" as const };
  return { status: "allowed" as const, member, roles };
}
