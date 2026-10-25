export type QuoteRequest = {
  name: string;
  product: string;
  quantity: string;
  specifications: string;
  design: string;
};

export function buildQuoteMessage(request: QuoteRequest) {
  return [
    "Hola, La Imprenta. Quisiera solicitar un presupuesto.",
    `Nombre o empresa: ${request.name.trim()}`,
    `Trabajo: ${request.product}`,
    `Cantidad: ${request.quantity || "A definir"}`,
    `Características: ${request.specifications.trim() || "Necesito asesoramiento"}`,
    `Diseño: ${request.design}`,
  ].join("\n\n");
}
