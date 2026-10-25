"use client";

import { useState } from "react";
import { buildQuoteMessage, type QuoteRequest } from "./quote-message";

const initialRequest: QuoteRequest = { name: "", product: "Folletos y volantes", quantity: "", specifications: "", design: "Necesito asesoramiento" };

export function QuoteForm() {
  const [request, setRequest] = useState(initialRequest);
  const [reviewing, setReviewing] = useState(false);
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  const configured = !!number && /^\d{8,15}$/.test(number);
  const message = buildQuoteMessage(request);
  function update(field: keyof QuoteRequest, value: string) {
    setRequest((current) => ({ ...current, [field]: value }));
    setReviewing(false);
  }

  return <div className="quote-card">
    <div className="card-heading"><span className="eyebrow">TU PRÓXIMO PROYECTO</span><span className="pill">Sin crear una cuenta</span></div>
    <h3>Contanos qué tenés en mente.</h3>
    <p className="muted">No necesitás saber de papeles ni de impresión. Te ayudamos a elegir.</p>
    <form onSubmit={(event) => { event.preventDefault(); setReviewing(true); }}>
      <label>Tu nombre o empresa<input required maxLength={120} autoComplete="organization" value={request.name} onChange={(event) => update("name", event.target.value)} placeholder="¿Cómo te llamás?" /></label>
      <div className="form-row">
        <label>¿Qué querés imprimir?<select value={request.product} onChange={(event) => update("product", event.target.value)}>{["Folletos y volantes", "Tarjetas personales", "Etiquetas y stickers", "Talonarios", "Imanes", "Otro trabajo"].map((product) => <option key={product}>{product}</option>)}</select></label>
        <label>Cantidad aproximada<input type="number" min="1" max="10000000" step="1" value={request.quantity} onChange={(event) => update("quantity", event.target.value)} placeholder="A definir" /></label>
      </div>
      <label>Medidas, materiales u otros detalles<textarea maxLength={1500} rows={3} value={request.specifications} onChange={(event) => update("specifications", event.target.value)} placeholder="Por ejemplo: 500 folletos de 10 × 15 cm, a color. Si no sabés, contanos para qué los necesitás." /></label>
      <label>¿Tenés el diseño?<select value={request.design} onChange={(event) => update("design", event.target.value)}><option>Necesito asesoramiento</option><option>Ya tengo un archivo</option><option>Necesito que lo diseñen</option></select></label>
      <button className="button dark full" type="submit">Revisar mi consulta <span aria-hidden="true">↗</span></button>
    </form>
    {reviewing && <section className="message-review" aria-live="polite" aria-label="Revisión de la consulta"><h4>Así quedará tu mensaje</h4><p className="message-text">{message}</p>{configured ? <a className="button pink full" href={`https://wa.me/${number}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">Abrir WhatsApp ↗</a> : <p className="setup-note">El envío por WhatsApp estará disponible cuando la imprenta confirme su número de contacto.</p>}<p className="small muted">El envío se completa en WhatsApp. Podés adjuntar tu archivo allí. Esta consulta no confirma un precio ni un pedido.</p></section>}
  </div>;
}
