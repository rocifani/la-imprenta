"use client";

import { useActionState, useState } from "react";
import { approveQuote } from "./actions";
import type { Quote,QuoteAlternative } from "./types";

export function ApprovalForm({ quote,alternatives=[] }: { quote: Quote;alternatives?:QuoteAlternative[] }) {
  const [state, action, pending] = useActionState(approveQuote, {});
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  return <form className="business-card" action={action}><h2>Registrar aprobación</h2><p className="field-help">Registrá la aceptación que ya recibiste del cliente. El presupuesto aprobado conserva estas características y precios.</p><input type="hidden" name="id" value={quote.id} /><input type="hidden" name="version" value={quote.version} />{state.error && <p role="alert" className="form-alert">{state.error}</p>}<fieldset disabled={pending} className="form-fields">{alternatives.length>1&&<fieldset className="roles-fieldset"><legend>Alternativa elegida por el cliente</legend>{alternatives.map(option=><label className="checkbox-row" key={option.id}><input type="radio" name="alternative_id" value={option.id} required/><span>{option.name}</span></label>)}</fieldset>}<label>Comentario de aprobación (opcional)<textarea maxLength={500} name="approval_note" rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ej.: Confirmado por el cliente por WhatsApp." /></label><label className="checkbox-row"><input type="checkbox" required name="confirmed" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>Confirmo que el cliente aprobó los trabajos, las características y el importe mostrado.</span></label><button className="button dark">{pending ? "Registrando…" : "Registrar aprobación del cliente"}</button></fieldset></form>;
}
