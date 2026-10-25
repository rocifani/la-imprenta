"use client";

import { useState } from "react";
import type { Customer } from "./types";

export function CustomerFields({ customer, name = "", phone = "" }: { customer?: Customer; name?: string; phone?: string }) {
  const [values, setValues] = useState({ display_name: customer?.display_name ?? name, contact_name: customer?.contact_name ?? "", phone: customer?.phone ?? phone, email: customer?.email ?? "", address: customer?.address ?? "", cuit: customer?.cuit ?? "", notes: customer?.notes ?? "" });
  const fields = [
    { key: "display_name", label: "Nombre o empresa", max: 160, required: true },
    { key: "cuit", label: "CUIT (opcional, 11 dígitos con o sin guiones)", max: 20 },
    { key: "contact_name", label: "Persona de contacto", max: 120 },
    { key: "phone", label: "Teléfono / WhatsApp", max: 50, type: "tel" },
    { key: "email", label: "Correo (opcional)", max: 254, type: "email" },
    { key: "address", label: "Dirección (opcional)", max: 250 },
  ] as const;
  return <>{fields.map((field) => <label key={field.key}>{field.label}<input name={field.key} type={"type" in field ? field.type : "text"} required={"required" in field && field.required} minLength={field.key === "display_name" ? 2 : undefined} maxLength={field.max} value={values[field.key]} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} /></label>)}<label>Observaciones internas<textarea name="notes" rows={3} maxLength={2000} value={values.notes} onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))} /></label></>;
}
