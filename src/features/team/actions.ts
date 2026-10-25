"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isTeamRole } from "@/features/auth/roles";
import { requireAdministrator } from "./queries";
import type { SaveMemberState } from "./types";

export async function saveMember(_previous: SaveMemberState, form: FormData): Promise<SaveMemberState> {
  await requireAdministrator();
  const id = String(form.get("id") ?? "");
  const version = Number(form.get("version"));
  const name = String(form.get("display_name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const roles = form.getAll("roles");
  const fields: SaveMemberState["fields"] = {};
  if (name.length < 2 || name.length > 120) fields.display_name = "Ingresá un nombre de entre 2 y 120 caracteres.";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fields.email = "Ingresá un correo válido de Google.";
  if (!roles.length || !roles.every(isTeamRole)) fields.roles = "Elegí al menos un rol válido.";
  if (Object.keys(fields).length) return { fields, error: "Revisá los campos indicados." };
  if (id && (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || !Number.isSafeInteger(version) || version < 1)) {
    return { error: "No pudimos identificar esta versión del usuario. Recargá la página." };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("save_team_member", {
    p_id: id || null, p_display_name: name, p_email: email,
    p_roles: roles, p_active: form.get("active") === "on", p_version: id ? version : null,
  });
  if (error) {
    if (error.code === "23505") return { fields: { email: "Ese correo ya tiene un acceso. Buscalo en la lista para editarlo." }, error: "El correo ya está registrado." };
    if (["22023", "23514", "40001", "P0002", "42501"].includes(error.code)) return { error: error.message };
    return { error: "No pudimos guardar el usuario. Intentá nuevamente." };
  }
  revalidatePath("/panel", "layout");
  redirect(`/panel/usuarios?notice=${id ? "updated" : "created"}`);
}
