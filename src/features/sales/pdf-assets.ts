import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function loadPdfAssets() {
  const [logo, regular, bold] = await Promise.all([
    readFile(join(process.cwd(), "public/brand/la-imprenta-logo.png")),
    readFile(join(process.cwd(), "public/brand/fonts/noto-sans-regular.woff")),
    readFile(join(process.cwd(), "public/brand/fonts/noto-sans-bold.woff")),
  ]);
  return { logo, regular, bold };
}
