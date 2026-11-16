"use client";

import Link from "next/link";
import { useState } from "react";
import { FilterForm } from "@/components/filter-form";
import { CustomerPicker, type CustomerOption } from "@/features/sales/customer-picker";

export function FinanceOrderFilters({ status, customer }: { status: string; customer: CustomerOption | null }) {
  const [selected, setSelected] = useState(customer);

  return <FilterForm className="business-card">
    <div className="filter-grid">
      <label>Estado
        <select name="status" defaultValue={status}>
          <option value="unpaid">Con saldo pendiente</option>
          <option value="overdue">Atrasos: 15 días o más</option>
          <option value="all">Todas las notas</option>
        </select>
      </label>
      <CustomerPicker value={selected} onChange={setSelected} placeholder="Todos los clientes" endpoint="/panel/finanzas/clientes/buscar" />
    </div>
    <div className="form-actions">
      <button className="button dark">Aplicar filtros</button>
      <Link className="button secondary" href="/panel/finanzas/pedidos">Limpiar</Link>
    </div>
  </FilterForm>;
}
