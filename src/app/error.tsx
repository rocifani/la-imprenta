"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="access-page"><section className="access-card"><h1>No pudimos cargar esta página.</h1><p>Revisá que los servicios estén disponibles y volvé a intentar.</p><button className="button dark full" onClick={reset}>Intentar nuevamente</button></section></main>;
}
