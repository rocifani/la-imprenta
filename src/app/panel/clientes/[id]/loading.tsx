import { LoadingIndicator } from "@/components/loading-indicator";

export default function LoadingDetail() {
  return <main className="users-page">
    <section className="business-card panel-loading">
      <LoadingIndicator label="Cargando la ficha…" />
      <div className="loading-placeholder" aria-hidden="true" />
      <div className="loading-placeholder" aria-hidden="true" />
    </section>
  </main>;
}
