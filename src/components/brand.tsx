import Link from "next/link";

export function Brand() {
  return <Link href="/" className="brand" aria-label="La Imprenta, inicio"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>la imprenta<span className="brand-dot">.</span></Link>;
}
