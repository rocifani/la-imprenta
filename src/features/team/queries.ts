import { redirect } from "next/navigation";
import { getTeamAccess } from "@/features/auth/team-access";
import { isTeamRole } from "@/features/auth/roles";
import type { TeamMember } from "./types";

export async function requireAdministrator() {
  const access = await getTeamAccess();
  if (access.status !== "allowed") redirect("/acceso");
  if (!access.roles.includes("administrator")) redirect("/panel");
  return access;
}

type MemberRow = Omit<TeamMember, "roles"> & { team_member_roles: { role: unknown }[] };

export function toTeamMember(row: MemberRow): TeamMember {
  const { team_member_roles, ...member } = row;
  return { ...member, roles: team_member_roles.map(({ role }) => role).filter(isTeamRole) };
}

export const memberColumns = "id, display_name, email, active, auth_user_id, version, team_member_roles(role)";
