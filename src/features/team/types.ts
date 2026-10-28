import type { TeamRole } from "@/features/auth/roles";

export type TeamMember = {
  id: string;
  display_name: string;
  email: string;
  active: boolean;
  auth_user_id: string | null;
  version: number;
  roles: TeamRole[];
};

export type SaveMemberState = {
  error?: string;
  fields?: Partial<Record<"display_name" | "email" | "roles", string>>;
};
