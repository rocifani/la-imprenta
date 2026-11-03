import { LoadingIndicator } from "@/components/loading-indicator";

export default function PanelLoading() {
  return <main className="users-page">
    <section className="business-card panel-loading" aria-busy="true">
      <LoadingIndicator label="Cargando el panel…" />
      <div className="loading-placeholder" aria-hidden="true" />
      <div className="loading-placeholder" aria-hidden="true" />
      <div className="loading-placeholder" aria-hidden="true" />
    </section>
  </main>;
}
