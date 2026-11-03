"use client";

import Link, { useLinkStatus } from "next/link";
import type { ReactNode } from "react";
import { LoadingIndicator } from "./loading-indicator";

function LinkProgress() {
  const { pending } = useLinkStatus();
  return pending ? <LoadingIndicator /> : null;
}

export function PaginationLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="pagination-link">{children}<LinkProgress /></Link>;
}
