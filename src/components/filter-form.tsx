"use client";

import { useTransition, type FormEvent, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LoadingIndicator } from "./loading-indicator";

export function FilterForm({ children, className }: { children: ReactNode; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const query = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget)) {
      if (typeof value === "string" && value !== "") query.append(key, value);
    }
    startTransition(() => router.push(query.size ? pathname + "?" + query : pathname));
  }

  return <form className={className} action={pathname} method="get" onSubmit={submit} aria-busy={pending}>
    <fieldset className="filter-form-fields" disabled={pending}>{children}</fieldset>
    {pending && <LoadingIndicator label="Actualizando resultados…" />}
  </form>;
}
