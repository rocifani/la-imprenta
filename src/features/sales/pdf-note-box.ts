import {rgb,type PDFPage,type PDFFont} from "pdf-lib";
import {wrap,createTextGuard} from "./pdf-text";

// Recuadro común a las notas para cliente y taller; conserva textos largos.
export function drawPdfNoteBox(options:{value:string;regular:PDFFont;bold:PDFFont;x:number;width:number;bottom:number;getPage:()=>PDFPage;getY:()=>number;setY:(y:number)=>void;addPage:()=>void}){
 const {value,regular,bold,x,width,bottom,getPage,getY,setY,addPage}=options;
 const lines=wrap(createTextGuard(regular)(value),regular,10,width-28);
 let offset=0;
 while(offset<lines.length){
  if(getY()-bottom<64)addPage();
  const count=Math.min(lines.length-offset,Math.max(1,Math.floor((getY()-bottom-34)/15)));
  const top=getY(),height=34+count*15,page=getPage();
  page.drawRectangle({x,y:top-height,width,height,color:rgb(.94,.94,.92),borderColor:rgb(.82,.83,.79),borderWidth:.6});
  page.drawText(offset?"TRABAJO GENERAL (CONTINUACIÓN)":"TRABAJO GENERAL",{x:x+14,y:top-18,size:8,font:bold,color:rgb(.32,.34,.29)});
  lines.slice(offset,offset+count).forEach((line,i)=>{if(line)page.drawText(line,{x:x+14,y:top-36-i*15,size:10,font:regular,color:rgb(.12,.13,.10)})});
  setY(top-height-18);offset+=count;
 }
}
