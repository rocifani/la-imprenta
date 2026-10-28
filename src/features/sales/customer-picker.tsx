"use client";

import { useEffect, useId, useState } from "react";
import type { Customer } from "./types";

export type CustomerOption = Pick<Customer, "id" | "display_name" | "phone"> & {contact_name?:string};

export function CustomerPicker({ value, onChange, name = "customer_id", required = false, endpoint = "/panel/clientes/buscar" }: {
  value: CustomerOption | null;
  onChange: (customer: CustomerOption | null) => void;
  name?: string;
  required?: boolean;
  endpoint?: string;
}) {
  const helpId = useId();
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<CustomerOption[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true); setError("");
      try {
        const response = await fetch(`${endpoint}?q=${encodeURIComponent(search)}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("search");
        const data = await response.json();
        if (!controller.signal.aborted) setMatches(data.customers);
      } catch { if (!controller.signal.aborted) setError("No pudimos buscar clientes. Cambiá la búsqueda para reintentar."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, endpoint]);
  const options = value && !matches.some((customer) => customer.id === value.id) ? [value, ...matches] : matches;
  return <div className="customer-picker"><label>Buscar cliente<input type="search" maxLength={100} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre o teléfono" /></label><p id={helpId} role="status" className="field-help">{loading ? "Buscando…" : "Hasta 20 coincidencias. Escribí para buscar en toda la base."}</p>{error && <p role="alert" className="field-error">{error}</p>}<label>Seleccionar cliente<select name={name} required={required} value={value?.id ?? ""} onChange={(event) => onChange(options.find((customer) => customer.id === event.target.value) ?? null)} aria-describedby={helpId}><option value="">Elegí un cliente</option>{options.map((customer) => <option key={customer.id} value={customer.id}>{customer.display_name}{customer.phone ? ` · ${customer.phone}` : ""}</option>)}</select></label>{!options.length && !loading && !error && <p className="field-help">No hay clientes para esta búsqueda.</p>}</div>;
}
