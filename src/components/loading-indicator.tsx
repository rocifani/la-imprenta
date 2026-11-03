export function LoadingIndicator({ label = "Cargando…" }: { label?: string }) {
  return <span className="loading-indicator" role="status">
    <span className="loading-spinner" aria-hidden="true" />
    {label}
  </span>;
}
