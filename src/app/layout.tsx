import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "La Imprenta | Tus ideas, en papel",
  description: "Contanos qué necesitás imprimir y solicitá un presupuesto personalizado por WhatsApp.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es-AR"><body>{children}</body></html>;
}
