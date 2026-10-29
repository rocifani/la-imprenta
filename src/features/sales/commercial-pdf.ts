import {drawPdfNoteBox} from "./pdf-note-box";
import {wrap,createTextGuard} from "./pdf-text";
export {PdfCharacterError} from "./pdf-text";
import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { documentNumber, formatDate, formatMoney } from "./money";
import { formatCuit } from "./cuit";
import type { CustomerOrderDocument } from "./order-document";
import type { CustomerQuoteDocument } from "./quote-document";

type PdfAssets = { logo: Uint8Array; regular: Uint8Array; bold: Uint8Array };
const width = 595.28;
const height = 841.89;
const margin = 42;
const bottom = 65;
const ink = rgb(.14, .15, .13);
const muted = rgb(.40, .43, .38);
const rule = rgb(.84, .86, .81);

export async function buildCommercialPdf(data: CustomerOrderDocument | CustomerQuoteDocument, assets: PdfAssets) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const [regular, bold, logo] = await Promise.all([
    pdf.embedFont(assets.regular, { subset: true }),
    pdf.embedFont(assets.bold, { subset: true }),
    pdf.embedPng(assets.logo),
  ]);
  const safeText=createTextGuard(regular);
  const isQuote = data.kind === "quote";
  const number = documentNumber(isQuote ? "PP" : "NP", data.number);
  const title = isQuote ? "Presupuesto" : "Nota de pedido";
  pdf.setTitle(`${title} ${number}${isQuote ? ` - versión ${data.revision}` : ""}`);
  pdf.setAuthor("La Imprenta");
  pdf.setCreator("La Imprenta");
  let page = pdf.addPage([width, height]);
  let y = 0;
  let inProducts = false;
  let continuingProduct: number | null = null;

  function text(value: string, x: number, baseline: number, size = 10, font = regular, color = ink) {
    page.drawText(safeText(value), { x, y: baseline, size, font, color });
  }
  function right(value: string, edge: number, baseline: number, size = 10, font = regular) {
    text(value, edge - font.widthOfTextAtSize(safeText(value), size), baseline, size, font);
  }
  function line() { page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: .7, color: rule }); }
  function productHeader() {
    text(isQuote?"TRABAJO Y CARACTERÍSTICAS":"ÍTEM Y CARACTERÍSTICAS", margin, y, 8, bold, muted);
    right("CANTIDAD", 432, y, 8, bold);
    right("TOTAL DEL LOTE", width - margin, y, 8, bold);
    y -= 12; line(); y -= 20;
  }
  function header() {
    page.drawImage(logo, { x: margin, y: height - 79, width: 180, height: 180 * logo.height / logo.width });
    if(isQuote){
      right(title.toLocaleUpperCase("es-AR"),width-margin,height-43,11,bold);
      right(number,width-margin,height-63,16,bold);
      right(`${formatDate(data.date)} · Versión ${data.revision} · ${data.status === "approved" ? "Aprobado" : "Borrador"}`,width-margin,height-81,8);
      y=height-99;
    }else{
      text("NOTA DE PEDIDO",margin,height-104,9,bold);
      text(number,margin,height-124,16,bold);
      text(formatDate(data.date),margin,height-141,9);
      let clientY=height-43;
      const clientX=width-margin-250;
      text("CLIENTE",clientX,clientY,8,bold,muted);clientY-=18;
      const clientLine=(value:string,size:number,font:PDFFont)=>{for(const line of wrap(safeText(value),font,size,250)){text(line,clientX,clientY,size,font);clientY-=size*1.4;}clientY-=4;};
      clientLine(data.customer.name,12,bold);
      if(data.customer.contact)clientLine(data.customer.contact,10,regular);
      for(const [label,value] of [["CUIT",data.customer.cuit?formatCuit(data.customer.cuit):""],["Teléfono",data.customer.phone],["Correo",data.customer.email],["Dirección",data.customer.address]])if(value)clientLine(label+": "+value,9,regular);
      y=Math.min(height-157,clientY-8);
    }
    const segment=(width-margin*2)/3;
    [rgb(0,.66,.84),rgb(.89,0,.45),rgb(.94,.84,0)].forEach((color,index)=>page.drawRectangle({x:margin+index*segment,y,width:segment,height:2,color}));
    y-=26;
    if (inProducts) {
      productHeader();
      if (continuingProduct !== null) { text(`Trabajo ${continuingProduct} (continuación)`, margin, y, 9, bold, muted); y -= 20; }
    }
  }
  function ensure(space: number) {
    if (y - space >= bottom) return;
    page = pdf.addPage([width, height]); header();
  }
  function paragraph(value: string, options: { x?: number; maxWidth?: number; size?: number; bold?: boolean; after?: number } = {}) {
    const size = options.size ?? 10;
    const font = options.bold ? bold : regular;
    for (const part of wrap(safeText(value), font, size, options.maxWidth ?? width - margin * 2)) {
      ensure(size * 1.5);
      if (part) text(part, options.x ?? margin, y, size, font);
      y -= size * 1.5;
    }
    y -= options.after ?? 7;
  }

  header();
  if(isQuote){
    paragraph("CLIENTE",{size:8,bold:true,after:7});
    paragraph(data.customer.name,{size:15,bold:true,after:10});
    if(data.customer.contact)paragraph(data.customer.contact,{size:11,after:9});
    for(const [label,value] of [["CUIT",data.customer.cuit?formatCuit(data.customer.cuit):""],["Teléfono",data.customer.phone],["Correo",data.customer.email],["Dirección",data.customer.address]])if(value)paragraph(label+": "+value,{size:10,after:3});
    y-=18;
  }else if(data.workDescription){
    drawPdfNoteBox({value:data.workDescription,regular,bold,x:margin,width:width-margin*2,bottom,getPage:()=>page,getY:()=>y,setY:value=>{y=value},addPage:()=>{page=pdf.addPage([width,height]);header()}});
  }
  function drawItems(rows:typeof data.items){
  // El encabezado de tabla se repite al continuar en otra página.
  ensure(95); inProducts = true; productHeader();
  for (const [index, item] of rows.entries()) {
    const titleLines = wrap(safeText(`${index + 1}. ${item.description}`), bold, 11, 316);
    ensure(47);
    continuingProduct = index + 1;
    right(item.quantity.toLocaleString("es-AR"), 432, y, 10);
    right(formatMoney(item.amount), width - margin, y, 10, bold);
    for (const title of titleLines) { ensure(17); text(title, margin, y, 11, bold); y -= 17; }
    if (item.specifications) paragraph(item.specifications, { maxWidth: 316, size: 9, after: 5 });
    continuingProduct = null;
    y -= 9;
    if (y >= bottom + 15) { line(); y -= 22; }
  }
  inProducts=false;
  }
  if(isQuote&&data.alternatives.length>1){
   for(const option of data.alternatives){ensure(130);paragraph(option.name+(option.selected?" · Alternativa aprobada":""),{size:13,bold:true});drawItems(option.items);ensure(50);paragraph("Total de esta alternativa: "+formatMoney(option.total),{size:12,bold:true,after:18});}
  }else drawItems(data.items);
  inProducts = false;
  if(!isQuote||data.alternatives.length<=1){
  ensure(85);
  y -= 10;
  text(isQuote ? "TOTAL PRESUPUESTADO · ARS" : "TOTAL ACORDADO · ARS", margin, y, 10, bold);
  right(formatMoney(data.total), width - margin, y - 2, 18, bold);
  y -= 26;
  }
  paragraph("Los importes corresponden al total de cada lote.", { size: 8 });
  if (!isQuote) {
    ensure(100);
    paragraph(`Seña recibida: ${formatMoney(data.deposit)}`, {size:10});
    if (data.paid > data.deposit) paragraph(`Otros cobros registrados: ${formatMoney(data.paid-data.deposit)}`, {size:10});
    paragraph(`Saldo pendiente: ${formatMoney(data.balance)}`, {size:12,bold:true});
    paragraph("Saldo según los cobros registrados al emitir este documento.", {size:8});
  }
  if (isQuote && data.conditions) {
    y -= 12; ensure(45);
    paragraph("OBSERVACIONES Y CONDICIONES", { size: 9, bold: true });
    paragraph(data.conditions, { size: 9 });
  }
  const pages = pdf.getPages();
  pages.forEach((currentPage, index) => {
    currentPage.drawLine({ start: { x: margin, y: 47 }, end: { x: width - margin, y: 47 }, thickness: .5, color: rule });
    currentPage.drawText(`La Imprenta · ${number}`, { x: margin, y: 31, size: 8, font: regular, color: muted });
    const footer = `${index + 1} / ${pages.length}`;
    currentPage.drawText(footer, { x: width - margin - regular.widthOfTextAtSize(footer, 8), y: 31, size: 8, font: regular, color: muted });
  });
  return pdf.save();
}
