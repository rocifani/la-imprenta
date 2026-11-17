"use client";

import { useActionState, useEffect, useState } from "react";
import { ConfirmedForm } from "@/components/confirmed-form";
import { LoadingIndicator } from "@/components/loading-indicator";
import { PagedSection } from "@/components/paged-section";
import { CustomerPicker } from "@/features/sales/customer-picker";
import { documentNumber, formatMoney, moneyToCents } from "@/features/sales/money";
import { splitPages } from "@/features/sales/list-controls";
import { PaymentFields } from "./payment-fields";
import { recordCustomerPayment } from "./actions";
import type { CustomerAccount } from "./customer-payment-types";

export function CustomerPaymentForm({ id, initialAccount }: { id: string; initialAccount: CustomerAccount | null }) {
  const [state, action, pending] = useActionState(recordCustomerPayment, {});
  const [selected, setSelected] = useState(initialAccount?.customer ?? null);
  const [account, setAccount] = useState(initialAccount);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setAccount(null);
    setError("");
    if (!selected) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    async function load() {
      try {
        const response = await fetch("/panel/finanzas/clientes/" + selected!.id + "/cuenta", { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("account");
        const data = await response.json() as CustomerAccount;
        if (!controller.signal.aborted) setAccount(data);
      } catch {
        if (!controller.signal.aborted) setError("No pudimos cargar los saldos. Reintentá para continuar.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [selected, retry]);

  const cents = moneyToCents(amount);
  let remaining = cents ?? 0;
  const allocations = [];
  for (const order of account?.orders ?? []) {
    const applied = Math.min(remaining, Math.round(order.balance * 100));
    if (applied > 0) allocations.push({ ...order, applied: applied / 100 });
    remaining -= applied;
  }

  return <ConfirmedForm action={action} pending={pending}
    title="¿Registrar y distribuir este cobro?"
    description={selected ? "Cliente " + selected.display_name + ". Se registrará " + (cents ? formatMoney(cents / 100) : "el importe indicado") + ". Se aplicará primero a las notas más antiguas y el excedente quedará como saldo a favor." : "Elegí un cliente antes de confirmar."}>
    <input type="hidden" name="id" value={id} />
    {state.error && <p className="form-alert" role="alert">{state.error}</p>}
    <fieldset className="form-fields" disabled={pending}>
      <CustomerPicker required value={selected} onChange={setSelected} endpoint="/panel/finanzas/clientes/buscar" />
      {loading && <LoadingIndicator label="Cargando saldos del cliente…" />}
      {error && <div><p className="form-alert" role="alert">{error}</p><button className="button secondary" type="button" onClick={() => setRetry(value => value + 1)}>Reintentar</button></div>}
      {account && <dl className="data-grid">
        <div><dt>Pendiente de cobrar</dt><dd>{formatMoney(account.balance)}</dd></div>
        <div><dt>Saldo a favor disponible</dt><dd>{formatMoney(account.credit)}</dd></div>
      </dl>}
      <PaymentFields label="Importe recibido del cliente (ARS)" onAmountChange={setAmount} />
      <label>Comentario o referencia del cheque (opcional)
        <textarea name="description" rows={2} maxLength={500} placeholder="Ej.: Número de cheque o referencia de transferencia" />
      </label>
      {account && cents !== null && <section className="business-card">
        <h2>Distribución estimada</h2>
        {allocations.length > 0 && <PagedSection label="Distribución del cobro" pages={splitPages(allocations).map((rows, index) => <ul key={index}>
          {rows.map(order => <li key={order.id}>{documentNumber("NP", order.number)} · {formatMoney(order.applied)}</li>)}
        </ul>)} />}
        <p>Excedente del nuevo cobro a favor del cliente · <strong>{formatMoney(remaining / 100)}</strong></p>
        <p className="field-help">La distribución se confirma con los saldos disponibles al guardar.</p>
      </section>}
      <button className="button dark" disabled={loading || !account || account.customer.id !== selected?.id}>
        {pending ? "Registrando…" : "Registrar y distribuir cobro"}
      </button>
    </fieldset>
  </ConfirmedForm>;
}
