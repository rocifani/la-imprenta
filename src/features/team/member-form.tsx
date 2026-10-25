"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { roleDescriptions, roleLabels, teamRoles } from "@/features/auth/roles";
import { saveMember } from "./actions";
import type { SaveMemberState, TeamMember } from "./types";

export function MemberForm({ member }: { member?: TeamMember }) {
  const [state, action, pending] = useActionState<SaveMemberState, FormData>(saveMember, {});
  const [name, setName] = useState(member?.display_name ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [roles, setRoles] = useState(member?.roles ?? []);
  const [active, setActive] = useState(member?.active ?? true);
  const administrator = member?.roles.includes("administrator");
  const linked = !!member?.auth_user_id;

  return <form action={action} className="member-form">
    <input type="hidden" name="id" value={member?.id ?? ""} />
    <input type="hidden" name="version" value={member?.version ?? ""} />
    {state.error && <p className="form-alert" role="alert">{state.error}</p>}
    <fieldset disabled={pending} className="form-fields">
      <label htmlFor="display_name">Nombre<input id="display_name" name="display_name" required minLength={2} maxLength={120} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} aria-invalid={!!state.fields?.display_name} aria-describedby={state.fields?.display_name ? "name-error" : undefined} />{state.fields?.display_name && <span id="name-error" className="field-error">{state.fields.display_name}</span>}</label>
      <label htmlFor="email">Correo de Google<input id="email" name="email" type="email" required maxLength={254} autoComplete="email" readOnly={linked || administrator} value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={!!state.fields?.email} aria-describedby="email-help" /><span id="email-help" className="field-help">{linked || administrator ? "Este correo está protegido. Para otra cuenta, creá un acceso nuevo." : "La persona deberá elegir esta cuenta exacta al ingresar con Google."}</span>{state.fields?.email && <span className="field-error">{state.fields.email}</span>}</label>
      <fieldset className="roles-fieldset" aria-describedby="roles-help"><legend>Roles</legend><p id="roles-help" className="field-help">Podés asignar varios. Elegí al menos uno.</p>{administrator && <><input type="hidden" name="roles" value="administrator" /><div className="protected-role"><strong>Administración de usuarios</strong><span className="field-help">Rol reservado a tu cuenta. Se conserva siempre.</span></div></>}{teamRoles.filter((role) => role !== "administrator").map((role) => <label className="checkbox-row" key={role}><input type="checkbox" name="roles" value={role} checked={roles.includes(role)} onChange={(event) => setRoles((current) => event.target.checked ? [...current, role] : current.filter((item) => item !== role))} /><span><strong>{roleLabels[role]}</strong><span className="field-help">{roleDescriptions[role]}</span></span></label>)}{state.fields?.roles && <p className="field-error">{state.fields.roles}</p>}</fieldset>
      {administrator ? <><input type="hidden" name="active" value="on" /><p className="setup-note">Tu cuenta administradora debe permanecer activa para conservar la gestión de accesos.</p></> : <label className="checkbox-row active-choice"><input type="checkbox" name="active" checked={active} onChange={(event) => setActive(event.target.checked)} /><span><strong>Acceso activo</strong><span className="field-help">Al desactivarlo, la persona pierde acceso a la gestión, aunque haya iniciado sesión antes.</span></span></label>}
      <div className="form-actions"><button type="submit" className="button dark">{pending ? "Guardando…" : member ? "Guardar cambios" : "Habilitar usuario"}</button><Link href="/panel/usuarios" className="button secondary">Cancelar</Link></div>
    </fieldset>
    <p className="small muted">No se envía un correo de invitación ni se crea una contraseña. La persona entra desde «Acceso del equipo» con su cuenta de Google. Los módulos de negocio se están implementando por etapas.</p>
  </form>;
}
