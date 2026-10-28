import Link from "next/link";

export function Pagination({ base, page, count, search = "", status = "", filters = {} }: { base: string; page: number; count: number; search?: string; status?: string; filters?: Record<string, string> }) {
  const href = (target: number) => `${base}?${new URLSearchParams({ ...filters, page: String(target), q: search, status })}`;
  return page > 1 || count > page * 20 ? <nav className="pagination" aria-label="Páginas de resultados">{page > 1 && <Link href={href(page - 1)}>← Anterior</Link>}<span>Página {page}</span>{count > page * 20 && <Link href={href(page + 1)}>Siguiente →</Link>}</nav> : null;
}

export function listParams(params: { page?: string; q?: string }) {
  const parsed = Number(params.page ?? 1);
  return { page: Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, 100000) : 1, search: (params.q ?? "").slice(0, 100).trim() };
}

export function searchTerm(value: string) { return value.replace(/[,%_()"'\\]/g, ""); }
