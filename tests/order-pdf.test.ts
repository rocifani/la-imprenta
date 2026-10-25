import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { customerOrderDocument } from "../src/features/sales/order-document";
import { buildOrderPdf, PdfCharacterError } from "../src/features/sales/order-pdf";
import { loadPdfAssets } from "../src/features/sales/pdf-assets";
import type { Order, OrderItem } from "../src/features/sales/types";

const order: Order = {
  id: "fixture", number: 146, quote_id: "private-quote-id", quote_version_id: "private-version-id", customer_id: "private-customer-id",
  customer_snapshot: { id: "private-customer-id", display_name: "Comercio de ejemplo", contact_name: "María Pérez", phone: "341 000 0000", email: "ejemplo@example.test", cuit: "20123456786", address: "Dirección de ejemplo, Rosario", notes: "NOTA PRIVADA DEL CLIENTE" },
  total: "96000.00", notes: "COSTO INTERNO NO COMPARTIR", invoiced: false, created_at: "2026-10-25T14:00:00Z",
};
const items: OrderItem[] = [{ id: "private-item-id", position: 1, description: "Imanes full color", specifications: "Tamaño 7 × 5 cm. Impresión full color. Corte láser.", quantity: 500, amount: "96000.00", production_status: "pending" }];

test("La versión para clientes excluye notas privadas, identificadores y avance interno", () => {
  const content = JSON.stringify(customerOrderDocument(order, items));
  for (const value of ["NOTA PRIVADA", "COSTO INTERNO", "private-", "production_status", "invoiced"]) assert.ok(!content.includes(value), value);
  assert.ok(content.includes("Imanes full color"));
});

test("Genera una nota corta con logo y texto español", async () => {
  const bytes = await buildOrderPdf(customerOrderDocument(order, items), await loadPdfAssets());
  const document = await PDFDocument.load(bytes);
  assert.equal(document.getPageCount(), 1);
  assert.equal(document.getTitle(), "Nota de pedido NP-000146");
  await mkdir("tmp/pdfs", { recursive: true });
  await writeFile("tmp/pdfs/nota-cliente-ejemplo.pdf", bytes);
});

test("Conserva descripciones largas en varias páginas", async () => {
  const longItems = Array.from({ length: 8 }, (_, index) => ({ ...items[0], position: index + 1, description: `Trabajo ${index + 1}: folletos, etiquetas y tarjetas personalizadas`, specifications: "Papel ilustración de 115 g. Frente y dorso, tamaño 10 × 15 cm. Terminación especial y corte. ".repeat(10), amount: "12000.00" }));
  const bytes = await buildOrderPdf(customerOrderDocument(order, longItems), await loadPdfAssets());
  const document = await PDFDocument.load(bytes);
  assert.ok(document.getPageCount() > 1);
  await mkdir("tmp/pdfs", { recursive: true });
  await writeFile("tmp/pdfs/nota-cliente-multipagina.pdf", bytes);
});

test("No entrega un documento con caracteres que la fuente no puede representar", async () => {
  const data = customerOrderDocument(order, items);
  data.customer.name = "Comercio 🛸";
  await assert.rejects(buildOrderPdf(data, await loadPdfAssets()), PdfCharacterError);
});
