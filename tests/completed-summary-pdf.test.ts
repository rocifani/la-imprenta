import test from "node:test";
import assert from "node:assert/strict";
import {mkdir,writeFile} from "node:fs/promises";
import {PDFDocument} from "pdf-lib";
import {completedSummaryDocument,summaryBalances,type CompletedCustomerSummary} from "../src/features/sales/completed-summary";
import {buildCompletedSummaryPdf} from "../src/features/sales/completed-summary-pdf";
import {loadPdfAssets} from "../src/features/sales/pdf-assets";
const base:CompletedCustomerSummary={generated_at:"2026-10-25T15:00:00Z",customer:{id:"private-customer",name:"Comercio de ejemplo",cuit:"20123456789",phone:"341 0000000",email:"comercio@example.test",address:"Rosario"},balance:60000,orders:[{id:"private-order",number:146,created_at:"2026-10-24T15:00:00Z",total:96000,paid:36000,balance:60000,completed_total:48000,items:[{description:"Talonarios comerciales terminados",quantity:100,amount:48000}]}]};
test("La proyección no incluye claves ni datos internos agregados por accidente",()=>{const source={...base,notes:"PRIVATE NOTE",orders:base.orders.map(o=>({...o,specifications:"PRIVATE SPEC",items:o.items.map(i=>({...i,technical_sheet:{observations:"PRIVATE TECH"}}))}))};const content=JSON.stringify(completedSummaryDocument(source));assert.ok(!content.includes("PRIVATE"));assert.ok(!content.includes("private-"));assert.ok(content.includes("Talonarios comerciales terminados"));});
test("Genera resumen corto y diferencia importe terminado del saldo de nota",async()=>{const document=completedSummaryDocument(base);assert.equal(document.orders[0].completed_total,48000);assert.equal(document.orders[0].balance,60000);const bytes=await buildCompletedSummaryPdf(document,await loadPdfAssets());assert.equal((await PDFDocument.load(bytes)).getPageCount(),1);await mkdir("tmp/pdfs",{recursive:true});await writeFile("tmp/pdfs/resumen-cliente-terminados.pdf",bytes);});
test("Incluye más de veinte notas y conserva textos largos en varias páginas",async()=>{const source={...base,balance:base.balance*24,orders:Array.from({length:24},(_,index)=>({...base.orders[0],id:String(index),number:index+1,items:[{description: `Trabajo terminado ${index+1}. `+"Descripción comercial extensa para el cliente. ".repeat(15),quantity:100,amount:48000}]}))};const bytes=await buildCompletedSummaryPdf(completedSummaryDocument(source),await loadPdfAssets());assert.ok((await PDFDocument.load(bytes)).getPageCount()>3);await writeFile("tmp/pdfs/resumen-cliente-multipagina.pdf",bytes);});
test("Permite descargar un resumen sin trabajos terminados",async()=>{const source={...base,balance:0,orders:[]};const bytes=await buildCompletedSummaryPdf(completedSummaryDocument(source),await loadPdfAssets());assert.equal((await PDFDocument.load(bytes)).getPageCount(),1);await writeFile("tmp/pdfs/resumen-cliente-vacio.pdf",bytes);});

test("Omite notas saldadas, conserva saldos a favor y ordena por número ascendente",()=>{
 const source={...base,balance:9999,orders:[{...base.orders[0],number:9,balance:50},{...base.orders[0],number:2,balance:0},{...base.orders[0],number:3,balance:-20},{...base.orders[0],number:1,balance:100}]};
 const document=completedSummaryDocument(source);
 assert.deepEqual(document.orders.map(order=>order.number),[1,3,9]);assert.equal(document.balance,130);
 assert.deepEqual(source.orders.map(order=>order.number),[9,2,3,1]);
});

test("El resumen conserva el saldo a favor aunque no queden notas pendientes", async () => {
  const document = completedSummaryDocument({ ...base, balance: 0, credit: 800, orders: [] });
  assert.equal(document.credit, 800);
  const bytes = await buildCompletedSummaryPdf(document, await loadPdfAssets());
  assert.equal((await PDFDocument.load(bytes)).getPageCount(), 1);
  await writeFile("tmp/pdfs/resumen-cliente-saldo-a-favor.pdf", bytes);
});

test("Cuenta corriente y detalle de pagos sin exponer notas internas",async()=>{
 const source:CompletedCustomerSummary={...base,orders:[{...base.orders[0],payments:[{date:"2026-10-24",amount:36000,method:"check",kind:"payment"}]}],account:{debit:96000,credit:36000,balance:60000,entries:[{date:"2026-10-24",kind:"order",description:"Talonarios comerciales, impresión a dos colores y numeración correlativa",number:146,debit:96000,credit:0,balance:96000,method:null,allocations:[]},{date:"2026-10-25",kind:"payment",number:null,debit:0,credit:36000,balance:60000,method:"check",allocations:[{number:146,amount:36000}]}]}};
 const doc=completedSummaryDocument(source);
 assert.equal(doc.account?.credit,36000);assert.equal(doc.orders[0].payments[0].amount,36000);
 const bytes=await buildCompletedSummaryPdf(doc,await loadPdfAssets());assert.equal((await PDFDocument.load(bytes)).getPageCount(),2);
 await writeFile("tmp/pdfs/resumen-cuenta-corriente.pdf",bytes);
 const extended={...source,account:{...source.account!,entries:Array.from({length:45},(_,i)=>({...source.account!.entries[1],date:"2026-10-25",allocations:Array.from({length:8},(_,j)=>({number:i*8+j+1,amount:100}))}))}};
 const long=await buildCompletedSummaryPdf(completedSummaryDocument(extended),await loadPdfAssets());assert.ok((await PDFDocument.load(long)).getPageCount()>4);await writeFile("tmp/pdfs/cuenta-corriente-larga.pdf",long);
});

test("Concilia el subtotal de notas terminadas con la deuda total del cliente",()=>{
 const totals=summaryBalances({balance:3700,credit:0,account:{debit:11000,credit:7000,balance:4000,entries:[]}});
 assert.deepEqual(totals,{included:3700,other:300,credit:0,total:4000});
 assert.deepEqual(summaryBalances({balance:0,credit:407,account:{debit:4913,credit:5320,balance:-407,entries:[]}}),{included:0,other:0,credit:407,total:-407});
});
