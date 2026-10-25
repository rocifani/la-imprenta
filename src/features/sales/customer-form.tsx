"use client";

import { useActionState } from "react";
import Link from "next/link";
import { saveCustomer } from "./actions";
import { CustomerFields } from "./customer-fields";
import type { Customer } from "./types";

export function CustomerForm({ id, customer }: { id: string; customer?: Customer }) {
  const [state, action, pending] = useActionState(saveCustomer, {});
  return <form className="member-form" action={action}><input type="hidden" name="id" value={id} /><input type="hidden" name="version" value={customer?.version ?? ""} />{state.error && <p role="alert" className="form-alert">{state.error}</p>}<fieldset disabled={pending} className="form-fields"><CustomerFields customer={customer} /><div className="form-actions"><button className="button dark">{pending ? "Guardando…" : "Guardar cliente"}</button><Link className="button secondary" href={customer ? `/panel/clientes/${id}` : "/panel/clientes"}>Cancelar</Link></div></fieldset></form>;
}
