import {validTechnicalSheet} from "./technical-sheet";
export function readOrderHeader(form:FormData){
 const description=String(form.get("work_description")??"").trim();
 let sheet:unknown;
 try{sheet=JSON.parse(String(form.get("order_technical_sheet")??"{}"))}catch{return {error:"Revisá la ficha técnica general de la nota."}}
 if(description.length>2000||!validTechnicalSheet(sheet))return {error:"Revisá la descripción y la ficha técnica general de la nota."};
 return {description,sheet};
}
