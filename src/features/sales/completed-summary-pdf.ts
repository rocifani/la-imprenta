import {statementDescription} from "./customer-statement-description";
import {summaryBalances} from "./completed-summary";
import {methodLabels} from "@/features/finance/shared";
import {PDFDocument,rgb,type PDFFont} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import {wrap,createTextGuard} from "./pdf-text";
import {formatDate,formatMoney,documentNumber} from "./money";
import {formatCuit} from "./cuit";
import type {CompletedSummaryDocument} from "./completed-summary";
import type {loadPdfAssets} from "./pdf-assets";

export async function buildCompletedSummaryPdf(data:CompletedSummaryDocument,assets:Awaited<ReturnType<typeof loadPdfAssets>>){
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
 const [regular,bold,logo]=await Promise.all([pdf.embedFont(assets.regular,{subset:true}),pdf.embedFont(assets.bold,{subset:true}),pdf.embedPng(assets.logo)]);
 const safe=createTextGuard(regular);const width=595.28,height=841.89,margin=42,bottom=66;const ink=rgb(.14,.15,.13),muted=rgb(.4,.43,.38),rule=rgb(.84,.86,.81);
 pdf.setTitle("Resumen de trabajos terminados y saldos");pdf.setAuthor("La Imprenta");pdf.setCreator("La Imprenta");
 let page=pdf.addPage([width,height]),y=0;let section="Trabajos terminados y saldos";
 function text(value:string,x:number,baseline:number,size=10,font:PDFFont=regular){page.drawText(safe(value),{x,y:baseline,size,font,color:ink});}
 function right(value:string,baseline:number,size=10,font:PDFFont=regular){text(value,width-margin-font.widthOfTextAtSize(safe(value),size),baseline,size,font);}
 function header(){page.drawImage(logo,{x:margin,y:height-79,width:180,height:180*logo.height/logo.width});right("RESUMEN DEL CLIENTE",height-43,11,bold);right(section,height-62,9);right(formatDate(data.generated_at),height-80,9);const segment=(width-margin*2)/3;[rgb(0,.66,.84),rgb(.89,0,.45),rgb(.94,.84,0)].forEach((color,i)=>page.drawRectangle({x:margin+i*segment,y:height-99,width:segment,height:2,color}));y=height-125;}
 function ensure(space:number){if(y-space<bottom){page=pdf.addPage([width,height]);header();}}
 function paragraph(value:string,options:{size?:number;bold?:boolean;maxWidth?:number;after?:number}={}){const size=options.size??10,font=options.bold?bold:regular;for(const line of wrap(safe(value),font,size,options.maxWidth??width-margin*2)){ensure(size*1.5);if(line)text(line,margin,y,size,font);y-=size*1.5;}y-=options.after??7;}
 function ruleLine(){page.drawLine({start:{x:margin,y},end:{x:width-margin,y},thickness:.6,color:rule});y-=18;}
 header();paragraph(data.customer.name,{size:16,bold:true});
 for(const [label,value] of [["CUIT",data.customer.cuit?formatCuit(data.customer.cuit):""],["Teléfono",data.customer.phone],["Correo",data.customer.email],["Dirección",data.customer.address]])if(value)paragraph(label+": "+value,{size:9,after:3});
 y-=14;paragraph("TRABAJOS TERMINADOS",{size:11,bold:true});
 if(!data.orders.length)paragraph("No hay notas con trabajos terminados y saldo pendiente o a favor.");
 for(const order of data.orders){
  ensure(110);ruleLine();paragraph(documentNumber("NP",order.number)+" · "+formatDate(order.created_at),{size:12,bold:true});
  for(const item of order.items){
   ensure(48);const label=item.description;const lines=wrap(safe(label),bold,10,315);
   text("Cant. "+item.quantity.toLocaleString("es-AR"),375,y,9);right(formatMoney(item.amount),y,10,bold);
   for(const line of lines){ensure(16);text(line,margin,y,10,bold);y-=16;}y-=10;
  }
  ensure(110);paragraph("Importe de los trabajos terminados: "+formatMoney(order.completed_total),{size:9});
  paragraph("Pagos y señas aplicados a la nota: "+formatMoney(order.paid),{size:9});
  for(const p of order.payments)paragraph(formatDate(p.date+"T12:00:00Z")+" · "+(p.kind==="deposit"?"Seña":p.kind==="credit_application"?"Saldo a favor aplicado":"Pago")+" · "+(methodLabels[p.method as keyof typeof methodLabels]??p.method)+" · "+formatMoney(p.amount),{size:9});
  paragraph((order.balance<0?"Saldo a favor en la nota: ":"Resta pagar de la nota: ")+formatMoney(Math.abs(order.balance)),{size:11,bold:true,after:14});
 }
 const totals=summaryBalances(data);
 ensure(120);ruleLine();paragraph("Subtotal de las notas de este resumen: "+formatMoney(totals.included),{size:10,bold:true});
 if(totals.credit>0)paragraph("Pagos a favor y anticipos: "+formatMoney(totals.credit),{size:9});
 paragraph((totals.total<0?"SALDO A FAVOR DEL CLIENTE: ":"TOTAL PENDIENTE DEL CLIENTE: ")+formatMoney(Math.abs(totals.total)),{size:13,bold:true});
 if(data.account){
  section="Cuenta corriente";page=pdf.addPage([width,height]);header();paragraph("CUENTA CORRIENTE",{size:14,bold:true});paragraph(data.customer.name,{size:12,bold:true});
  paragraph("Debe · Trabajos terminados: "+formatMoney(data.account.debit),{bold:true});paragraph("Haber · Total pagado, incluidas señas: "+formatMoney(data.account.credit),{bold:true});paragraph((data.account.balance<0?"Saldo a favor: ":"Resta pagar: ")+formatMoney(Math.abs(data.account.balance)),{bold:true});
  const xs=[margin,104,293,376,459,width-margin];
  function tableHeader(){
   page.drawRectangle({x:margin,y:y-23,width:width-margin*2,height:27,color:rgb(.93,.94,.91)});
   ["Fecha","Descripción","Debe","Haber","Saldo"].forEach((label,i)=>text(label,xs[i]+5,y-13,8,bold));y-=36;
  }
  function amount(value:number,xEnd:number,baseline:number){const label=formatMoney(value);const size=Math.min(8,80/regular.widthOfTextAtSize(safe(label),1));text(label,xEnd-5-regular.widthOfTextAtSize(safe(label),size),baseline,size);}
  tableHeader();
  for(const e of data.account.entries){
   const lines=wrap(safe(statementDescription(e)),regular,8,179);
   const rowHeight=Math.max(30,lines.length*12+14);
   if(y-Math.min(rowHeight,250)<bottom){page=pdf.addPage([width,height]);header();tableHeader();}
   let first=true;
   for(const line of lines){
    if(y-20<bottom){page=pdf.addPage([width,height]);header();tableHeader();text("Continuación",xs[0]+5,y,7);}
    if(first){text(formatDate(e.date+"T12:00:00Z"),xs[0]+5,y,7);
     if(e.debit)amount(e.debit,xs[3],y);if(e.credit)amount(e.credit,xs[4],y);amount(e.balance,xs[5],y);first=false;}
    text(line,xs[1]+5,y,8);y-=12;
   }
   y-=10;page.drawLine({start:{x:margin,y},end:{x:width-margin,y},thickness:.5,color:rule});y-=12;
  }

 }
 const pages=pdf.getPages();pages.forEach((page,index)=>{page.drawLine({start:{x:margin,y:47},end:{x:width-margin,y:47},thickness:.5,color:rule});page.drawText("La Imprenta · Resumen del cliente",{x:margin,y:31,size:8,font:regular,color:muted});const label=`${index+1} / ${pages.length}`;page.drawText(label,{x:width-margin-regular.widthOfTextAtSize(label,8),y:31,size:8,font:regular,color:muted});});
 return pdf.save();
}
