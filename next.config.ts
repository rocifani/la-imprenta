import type { NextConfig } from "next";

const config: NextConfig = {
  outputFileTracingIncludes: {
    "/panel/pedidos/*/taller/pdf": ["./public/brand/la-imprenta-logo.png", "./public/brand/fonts/*.woff"],
    "/panel/pedidos/*/pdf": ["./public/brand/la-imprenta-logo.png", "./public/brand/fonts/*.woff"],
    "/panel/presupuestos/*/pdf": ["./public/brand/la-imprenta-logo.png", "./public/brand/fonts/*.woff"],
  },
};

export default config;
