import Link from "next/link";
import Image from "next/image";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="La Imprenta, inicio">
      <Image
        src="/brand/la-imprenta-logo.png"
        alt="La Imprenta"
        width={2241}
        height={519}
        sizes="(max-width: 680px) 150px, 220px"
        className="brand-logo"
      />
    </Link>
  );
}
