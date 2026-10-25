import Link from "next/link";

export default function NotFound() {
  return <main className="access-page"><section className="access-card"><span className="eyebrow">404</span><h1>Esta página no está.</h1><p>Volvé al inicio para encontrar lo que necesitás.</p><Link href="/" className="button dark">Volver al inicio ↗</Link></section></main>;
}
