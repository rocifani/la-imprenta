"use client";

import { useState, type ReactNode } from "react";

export function PagedSection({ pages, label }: { pages: ReactNode[]; label: string }) {
  const [index, setIndex] = useState(0);
  const current = Math.min(index, pages.length - 1);

  return <>
    {pages[current]}
    {pages.length > 1 && <nav className="pagination" aria-label={label}>
      <button type="button" disabled={current === 0} onClick={() => setIndex(current - 1)}>← Anterior</button>
      <span role="status">Página {current + 1} de {pages.length}</span>
      <button type="button" disabled={current === pages.length - 1} onClick={() => setIndex(current + 1)}>Siguiente →</button>
    </nav>}
  </>;
}
