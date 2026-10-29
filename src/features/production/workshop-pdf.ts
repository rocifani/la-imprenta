import {drawPdfNoteBox} from "@/features/sales/pdf-note-box";
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
 let page=pdf.addPage([w,h]),y=0,first=true;
 const number=documentNumber("NP",data.number);pdf.setTitle("Ficha de taller "+number);pdf.setAuthor("La Imprenta");
 function text(value:string,x:number,baseline:number,size=9,font:PDFFont=regular){page.drawText(safe(value),{x,y:baseline,size,font,color:black});}
 function header(){
  page.drawImage(logo,{x:m,y:h-73,width:220,height:220*logo.height/logo.width});
  text("NOTA DE PEDIDO · TALLER",m,h-99,9,bold);text(number,m,h-119,16,bold);text(formatDate(data.date),m,h-136,9);
  let clientY=h-35;text("CLIENTE",330,clientY,8,bold);clientY-=18;
  for(const part of wrap(safe(data.customer),bold,12,w-m-330)){text(part,330,clientY,12,bold);clientY-=17;}
  for(const part of wrap(safe("Responsable: "+data.responsible),regular,9,w-m-330)){text(part,330,clientY-8,9);clientY-=13;}
  y=Math.min(h-151,clientY-18);page.drawLine({start:{x:m,y},end:{x:w-m,y},thickness:1,color:black});y-=24;
 }
 function newPage(){if(first){first=false}else page=pdf.addPage([w,h]);header();}
 function ensure(space:number){if(y-space<bottom){page=pdf.addPage([w,h]);header();}}
 function paragraph(value:string,size=9,isBold=false){const font=isBold?bold:regular;for(const part of wrap(safe(value),font,size,w-2*m-12)){ensure(size*1.5);text(part,m+6,y,size,font);y-=size*1.5;}y-=7;}
 function section(title:string){ensure(38);page.drawRectangle({x:m,y:y-5,width:w-2*m,height:18,color:black});page.drawText(safe(title),{x:m+6,y:y+1,size:9,font:bold,color:rgb(1,1,1)});y-=25;}
 const columns=[128,46,48,110,44,59,92];
 function tableHeader(){ensure(40);let x=m;compositionFields.forEach(([,label],i)=>{page.drawRectangle({x,y:y-23,width:columns[i],height:23,color:gray,borderColor:line,borderWidth:.6});const parts=wrap(label,bold,7,columns[i]-8);parts.forEach((part,k)=>text(part,x+4,y-9-k*8,7,bold));x+=columns[i]});y-=23;}
 newPage();
 if(data.description)drawPdfNoteBox({value:data.description,regular,bold,x:m,width:w-2*m,bottom,getPage:()=>page,getY:()=>y,setY:value=>{y=value},addPage:()=>{page=pdf.addPage([w,h]);header()}});
 section("ÍTEMS DE LA NOTA");
 for(const [i,item] of data.items.entries()){
  paragraph((i+1)+". "+item.name,10,true);
  paragraph("Cantidad: "+item.quantity.toLocaleString("es-AR")+" · "+(item.completed?"Terminado":"Pendiente"));
  if(item.instructions)paragraph("Indicaciones del ítem: "+item.instructions);
  if(item.completion_note)paragraph("Comentario al terminar: "+item.completion_note);
 }
 const sheet=data.sheet;
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
  const details=technicalFields.filter(([key])=>!["forms","observations","other_info"].includes(key)&&sheet[key]);
  const columnWidth=(w-2*m-20)/2;
  for(let i=0;i<details.length;i+=2){
   const cells=details.slice(i,i+2).map(([key,label])=>wrap(safe(label+": "+sheet[key]),regular,9,columnWidth));
   for(let lineIndex=0;lineIndex<Math.max(...cells.map(cell=>cell.length));lineIndex++){
    ensure(14);cells.forEach((cell,col)=>{if(cell[lineIndex])text(cell[lineIndex],m+6+col*(columnWidth+20),y,9)});y-=14;
   }
   y-=8;
  }
  if(sheet.other_info)paragraph("Otros datos: "+sheet.other_info);
  section("NUMERACIÓN");if(sheet.number_ranges?.length)for(const range of sheet.number_ranges)paragraph((range.point_of_sale?"Punto de venta "+range.point_of_sale+" · ":"")+"Desde "+(range.from||"sin indicar")+" hasta "+(range.to||"sin indicar"));else paragraph("Sin numeración indicada.");
  const latest=data.handoffs.at(-1);if(latest){section("ÚLTIMO PASE");paragraph(latest.from+" a "+latest.to+" · "+formatDate(latest.date));paragraph(latest.note);}
 pdf.getPages().forEach((current,i)=>{current.drawLine({start:{x:m,y:40},end:{x:w-m,y:40},thickness:.5,color:line});current.drawText(number+" · Uso interno del taller",{x:m,y:26,size:8,font:regular,color:black});const label=`${i+1} / ${pdf.getPageCount()}`;current.drawText(label,{x:w-m-regular.widthOfTextAtSize(label,8),y:26,size:8,font:regular,color:black});});return pdf.save();
}
