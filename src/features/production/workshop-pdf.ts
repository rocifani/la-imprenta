import {PDFDocument,rgb,type PDFFont} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import {wrap,createTextGuard} from "@/features/sales/pdf-text";
import {formatDate,documentNumber} from "@/features/sales/money";
import type {loadPdfAssets} from "@/features/sales/pdf-assets";
import {compositionFields,technicalFields} from "./technical-sheet";
import type {WorkshopDocument} from "./workshop-document";
export async function buildWorkshopPdf(data:WorkshopDocument,assets:Awaited<ReturnType<typeof loadPdfAssets>>){
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);
 const [regular,bold,logo]=await Promise.all([pdf.embedFont(assets.regular,{subset:true}),pdf.embedFont(assets.bold,{subset:true}),pdf.embedPng(assets.logo)]);
 const safe=createTextGuard(regular),w=595.28,h=841.89,m=34,bottom=57,black=rgb(.08,.08,.08),line=rgb(.25,.25,.25),gray=rgb(.95,.95,.95);
 let page=pdf.addPage([w,h]),y=0,index=0,first=true;
 const number=documentNumber("NP",data.number);pdf.setTitle("Ficha de taller "+number);pdf.setAuthor("La Imprenta");
 function text(value:string,x:number,baseline:number,size=9,font:PDFFont=regular){page.drawText(safe(value),{x,y:baseline,size,font,color:black});}
 function header(){page.drawImage(logo,{x:m,y:h-73,width:220,height:220*logo.height/logo.width});text("NOTA DE PEDIDO · TALLER",330,h-35,10,bold);text(number,330,h-55,16,bold);text(formatDate(data.date),330,h-72,9);y=h-99;page.drawLine({start:{x:m,y},end:{x:w-m,y},thickness:1,color:black});y-=20;text(`Trabajo ${index+1} de ${data.items.length}`,m,y,9,bold);const owners=wrap(safe("Responsable: "+data.responsible),regular,9,w-m-240);owners.forEach((part,i)=>text(part,240,y-i*12,9));y-=Math.max(22,owners.length*12+10);}
 function newPage(){if(first){first=false}else page=pdf.addPage([w,h]);header();}
 function ensure(space:number){if(y-space<bottom){page=pdf.addPage([w,h]);header();}}
 function paragraph(value:string,size=9,isBold=false){const font=isBold?bold:regular;for(const part of wrap(safe(value),font,size,w-2*m-12)){ensure(size*1.5);text(part,m+6,y,size,font);y-=size*1.5;}y-=7;}
 function section(title:string){ensure(38);page.drawRectangle({x:m,y:y-5,width:w-2*m,height:18,color:black});page.drawText(safe(title),{x:m+6,y:y+1,size:9,font:bold,color:rgb(1,1,1)});y-=25;}
 const columns=[128,46,48,110,44,59,92];
 function tableHeader(){ensure(40);let x=m;compositionFields.forEach(([,label],i)=>{page.drawRectangle({x,y:y-23,width:columns[i],height:23,color:gray,borderColor:line,borderWidth:.6});const parts=wrap(label,bold,7,columns[i]-8);parts.forEach((part,k)=>text(part,x+4,y-9-k*8,7,bold));x+=columns[i]});y-=23;}
 for(const item of data.items){
  newPage();paragraph("Cliente: "+data.customer,12,true);paragraph(item.name,12,true);paragraph("Cantidad acordada: "+item.quantity.toLocaleString("es-AR")+" · "+(item.completed?"Terminado":"Pendiente"));
  const sheet=item.sheet;
  section("FORMULARIOS Y OBSERVACIONES");paragraph(sheet.forms||"Sin identificación adicional.");paragraph(sheet.observations||"Sin observaciones adicionales.");if(data.notes)paragraph(data.notes);
  section("COMPOSICIÓN DEL TRABAJO");tableHeader();
  const rows=sheet.composition?.length?sheet.composition:[{}];
  for(const row of rows){
   const cells=compositionFields.map(([key],i)=>wrap(safe(row[key]||"—"),regular,8,columns[i]-8));let offset=0;
   const count=Math.max(...cells.map(cell=>cell.length));
   while(offset<count){
    if(y-bottom<28){page=pdf.addPage([w,h]);header();tableHeader();}
    const fits=Math.max(1,Math.floor((y-bottom-8)/11));const take=Math.min(count-offset,fits);const height=take*11+8;let x=m;
    cells.forEach((cell,i)=>{page.drawRectangle({x,y:y-height,width:columns[i],height,borderColor:line,borderWidth:.6});cell.slice(offset,offset+take).forEach((part,k)=>text(part,x+4,y-12-k*11,8));x+=columns[i]});y-=height;offset+=take;
   }
  }
  y-=20;section("IMPRESIÓN, ARMADO Y MEDIDAS");
  for(const [key,label] of technicalFields){if(["forms","observations"].includes(key))continue;if(sheet[key])paragraph(label+": "+sheet[key]);}
  section("NUMERACIÓN");if(sheet.number_ranges?.length)for(const range of sheet.number_ranges)paragraph((range.point_of_sale?"Punto de venta "+range.point_of_sale+" · ":"")+"Desde "+(range.from||"sin indicar")+" hasta "+(range.to||"sin indicar"));else paragraph("Sin numeración indicada.");
  if(item.instructions){section("INDICACIONES PARA EL TALLER");paragraph(item.instructions);}
  if(item.completion_note){section("COMENTARIO AL TERMINAR");paragraph(item.completion_note);}
  const latest=data.handoffs.at(-1);if(latest){section("ÚLTIMO PASE");paragraph(latest.from+" a "+latest.to+" · "+formatDate(latest.date));paragraph(latest.note);}
  index++;
 }
 pdf.getPages().forEach((current,i)=>{current.drawLine({start:{x:m,y:40},end:{x:w-m,y:40},thickness:.5,color:line});current.drawText(number+" · Uso interno del taller",{x:m,y:26,size:8,font:regular,color:black});const label=`${i+1} / ${pdf.getPageCount()}`;current.drawText(label,{x:w-m-regular.widthOfTextAtSize(label,8),y:26,size:8,font:regular,color:black});});return pdf.save();
}
