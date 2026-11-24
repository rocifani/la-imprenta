"use client";
import {useActionState,useState} from "react";
import {CustomerPicker,type CustomerOption} from "@/features/sales/customer-picker";
import {enableSupplier} from "./actions";
export function SupplierLinkForm(){const [contact,setContact]=useState<CustomerOption|null>(null);const [state,action,pending]=useActionState(enableSupplier,{});return <details className="business-card"><summary>¿Ya está registrado como cliente? Usar la misma ficha</summary><form action={action} className="member-form"><fieldset className="form-fields" disabled={pending}>{state.error&&<p className="form-alert" role="alert">{state.error}</p>}<CustomerPicker entity="contacto" label="Contacto existente" name="contact_id" required value={contact} onChange={setContact} endpoint="/panel/proveedores/buscar?all=1"/><button className="button dark">{pending?"Vinculando…":"Usar también como proveedor"}</button></fieldset></form></details>;}
