"use client";

import Link, { useLinkStatus } from "next/link";
import type { ReactNode } from "react";
import { LoadingIndicator } from "./loading-indicator";

function LinkProgress({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  return pending ? <LoadingIndicator label={label} /> : null;
}

export function PendingLink({ href, children, className, pendingLabel = "Cargando…" }: {
  href: string;
  children: ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  return <Link href={href} className={className}>
    {children}<LinkProgress label={pendingLabel} />
  </Link>;
}
