import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { customerOrderDocument } from "../src/features/sales/order-document";
import { buildCommercialPdf, PdfCharacterError } from "../src/features/sales/commercial-pdf";
import { loadPdfAssets } from "../src/features/sales/pdf-assets";
import type { Order, OrderItem, Quote, QuoteVersion } from "../src/features/sales/types";
import { customerQuoteDocument } from "../src/features/sales/quote-document";

const order: Order = {
  id: "fixture", number: 146, quote_id: "private-quote-id", quote_version_id: "private-version-id", customer_id: "private-customer-id",
  customer_snapshot: { id: "private-customer-id", display_name: "Comercio de ejemplo", contact_name: "María Pérez", phone: "341 000 0000", email: "ejemplo@example.test", cuit: "20123456786", address: "Dirección de ejemplo, Rosario", notes: "NOTA PRIVADA DEL CLIENTE" },
  total: "96000.00", notes: "COSTO INTERNO NO COMPARTIR", invoiced: false, created_at: "2026-10-25T14:00:00Z",
};
const items: OrderItem[] = [{ id: "private-item-id", position: 1, description: "Imanes full color", specifications: "Tamaño 7 × 5 cm. Impresión full color. Corte láser.", quantity: 500, amount: "96000.00", production_status: "pending", completion_note: "COMENTARIO PRIVADO DEL OPERARIO", completed_at: null }];

test("La versión para clientes excluye notas privadas, identificadores y avance interno", () => {
  const content = JSON.stringify(customerOrderDocument(order, items));
  for (const value of ["NOTA PRIVADA", "COSTO INTERNO", "private-", "production_status", "invoiced", "COMENTARIO PRIVADO", "completion_note"]) assert.ok(!content.includes(value), value);
  assert.ok(content.includes("Imanes full color"));
});

test("Genera una nota corta con logo y texto español", async () => {
  const bytes = await buildCommercialPdf(customerOrderDocument(order, items), await loadPdfAssets());
  const document = await PDFDocument.load(bytes);
  assert.equal(document.getPageCount(), 1);
  assert.equal(document.getTitle(), "Nota de pedido NP-000146");
  await mkdir("tmp/pdfs", { recursive: true });
  await writeFile("tmp/pdfs/nota-cliente-ejemplo.pdf", bytes);
});

test("Conserva descripciones largas en varias páginas", async () => {
  const longItems = Array.from({ length: 8 }, (_, index) => ({ ...items[0], position: index + 1, description: `Trabajo ${index + 1}: folletos, etiquetas y tarjetas personalizadas`, specifications: "Papel ilustración de 115 g. Frente y dorso, tamaño 10 × 15 cm. Terminación especial y corte. ".repeat(10), amount: "12000.00" }));
  const bytes = await buildCommercialPdf(customerOrderDocument(order, longItems), await loadPdfAssets());
  const document = await PDFDocument.load(bytes);
  assert.ok(document.getPageCount() > 1);
  await mkdir("tmp/pdfs", { recursive: true });
  await writeFile("tmp/pdfs/nota-cliente-multipagina.pdf", bytes);
});

test("No entrega un documento con caracteres que la fuente no puede representar", async () => {
  const data = customerOrderDocument(order, items);
  data.customer.name = "Comercio 🛸";
  await assert.rejects(buildCommercialPdf(data, await loadPdfAssets()), PdfCharacterError);
});

const quote: Quote = { id: "private-quote", number: 45, status: "approved", version: 3, revision: 2, current_version_id: "private-v2", created_at: "2026-10-25T14:00:00Z", approved_at: "2026-10-25T15:00:00Z", approval_note: "COMENTARIO INTERNO DE APROBACION", customer_id: "private-customer" };
const quoteVersion: QuoteVersion = { id: "private-v2", revision: 2, recipient_name: "María Pérez", recipient_phone: "341 000 0000", notes: "Condición de ejemplo: precio final del trabajo detallado.", created_at: "2026-10-25T14:00:00Z", customer_id: "private-customer" };

test("El presupuesto usa la versión elegida y excluye el comentario interno de aprobación", () => {
  const data = customerQuoteDocument(quote, { ...quoteVersion, revision: 1, recipient_name: "Destinatario original" }, items);
  assert.equal(data.status, "draft");
  assert.equal(data.customer.name, "Destinatario original");
  assert.equal(data.revision, 1);
  assert.equal(data.total, 96000);
  assert.ok(!JSON.stringify(data).includes("COMENTARIO INTERNO"));
  assert.ok(!JSON.stringify(data).includes("private-"));
});

test("Genera PDF de presupuestos aprobados y versiones anteriores como borrador", async () => {
  await mkdir("tmp/pdfs", { recursive: true });
  for (const revision of [1, 2]) {
    const data = customerQuoteDocument(quote, { ...quoteVersion, revision }, items);
    const bytes = await buildCommercialPdf(data, await loadPdfAssets());
    const pdf = await PDFDocument.load(bytes);
    assert.equal(pdf.getPageCount(), 1);
    assert.equal(pdf.getTitle(), `Presupuesto PP-000045 - versión ${revision}`);
    await writeFile(`tmp/pdfs/presupuesto-cliente-v${revision}.pdf`, bytes);
  }
});
