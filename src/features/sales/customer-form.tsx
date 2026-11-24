"use client";

import { useActionState } from "react";
import Link from "next/link";
import { saveSupplier } from "@/features/suppliers/actions";
import { saveCustomer } from "./actions";
import { CustomerFields } from "./customer-fields";
import type { Customer } from "./types";

export function CustomerForm({ id, customer, supplier=false }: { id: string; customer?: Customer;supplier?:boolean }) {
  const [state, action, pending] = useActionState(supplier?saveSupplier:saveCustomer, {});
  return <form className="member-form" action={action}><input type="hidden" name="id" value={id} /><input type="hidden" name="version" value={customer?.version ?? ""} />{state.error && <p role="alert" className="form-alert">{state.error}</p>}<fieldset disabled={pending} className="form-fields"><CustomerFields customer={customer} /><input type="hidden" name="contact_flags" value="1"/><div className="form-row"><label className="checkbox-row"><input type="checkbox" name="is_customer" defaultChecked={customer?.is_customer??!supplier}/>Es cliente</label><label className="checkbox-row"><input type="checkbox" name="is_supplier" defaultChecked={customer?.is_supplier??supplier}/>Es proveedor</label></div><div className="form-actions"><button className="button dark">{pending ? "Guardando…" : supplier?"Guardar proveedor":"Guardar cliente"}</button><Link className="button secondary" href={supplier?(customer?`/panel/proveedores/${id}`:"/panel/proveedores"):(customer?`/panel/clientes/${id}`:"/panel/clientes")}>Cancelar</Link></div></fieldset></form>;
}
