import { PaginationLink } from "@/components/pagination-link";

export function Pagination({ base, page, count, search = "", status = "", filters = {} }: {
  base: string;
  page: number;
  count: number;
  search?: string;
  status?: string;
  filters?: Record<string, string>;
}) {
  const pages = Math.max(1, Math.ceil(count / 20));
  if (page === 1 && pages === 1) return null;

  function href(target: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...filters, q: search, status, page: String(target) })) {
      if (value) params.set(key, value);
    }
    return base + "?" + params;
  }

  if (page > pages) {
    return <nav className="pagination" aria-label="Páginas de resultados">
      <PaginationLink href={href(pages)}>Volver a los resultados</PaginationLink>
    </nav>;
  }

  return <nav className="pagination" aria-label="Páginas de resultados">
    {page > 1 && <PaginationLink href={href(page - 1)}>← Anterior</PaginationLink>}
    <span>Página {page} de {pages}</span>
    {page < pages && <PaginationLink href={href(page + 1)}>Siguiente →</PaginationLink>}
  </nav>;
}

export function listParams(params: { page?: string; q?: string }) {
  const parsed = Number(params.page ?? 1);
  return { page: Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, 100000) : 1, search: (params.q ?? "").slice(0, 100).trim() };
}

export function searchTerm(value: string) { return value.replace(/[,%_()"'\\]/g, ""); }

export function splitPages<T>(items: T[], pageSize = 10): T[][] {
  const pages: T[][] = [];
  for (let start = 0; start < items.length; start += pageSize) {
    pages.push(items.slice(start, start + pageSize));
  }
  return pages;
}
