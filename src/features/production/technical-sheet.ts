export const compositionFields = [
 ["work_type","Tipo de trabajo"],["quantity","Cantidad"],["copies","Copias por juego"],["paper_color","Color del papel"],["grammage","Gramaje (g/m²)"],["perforated","Perforado"],["eyeleted","Ojalado"],
] as const;
export const technicalFields = [
 ["forms","Formularios / identificación"],["observations","Observaciones de producción"],["printing_color","Color de impresión"],["pad_details","En block / talonario de"],["original_attached","Original / referencia adjunta"],["width","Ancho (indicar unidad)"],["height","Alto (indicar unidad)"],["yield_quantity","Salen por pliego"],["sheet_format","Formato del pliego"],["total_sheets","Total de hojas"],["printer_code","Clave de imprenta"],["other_info","Otros datos"],
] as const;
export type CompositionRow=Partial<Record<typeof compositionFields[number][0],string>>;
export type TechnicalSheet=Partial<Record<typeof technicalFields[number][0],string>>&{composition?:CompositionRow[];number_ranges?:{point_of_sale?:string;from:string;to:string}[]};
export function validTechnicalSheet(value:unknown):value is TechnicalSheet{
 if(!value||typeof value!=="object"||Array.isArray(value))return false;
 const data=value as Record<string,unknown>;
 const allowed=new Set<string>([...technicalFields.map(([key])=>key),"composition","number_ranges"]);
 if(Object.keys(data).some(key=>!allowed.has(key)))return false;
 for(const [key] of technicalFields)if(data[key]!==undefined&&(typeof data[key]!=="string"||(data[key] as string).length>2000))return false;
 if(data.composition!==undefined){
  if(!Array.isArray(data.composition)||data.composition.length>20)return false;
  const keys=new Set<string>(compositionFields.map(([key])=>key));
  if(data.composition.some(row=>!row||typeof row!=="object"||Array.isArray(row)||Object.entries(row).some(([key,value])=>!keys.has(key)||typeof value!=="string"||value.length>120)))return false;
 }
 if(data.number_ranges!==undefined){
  if(!Array.isArray(data.number_ranges)||data.number_ranges.length>10)return false;
  if(data.number_ranges.some(row=>!row||typeof row!=="object"||Array.isArray(row)||Object.keys(row).some(key=>!["from","to","point_of_sale"].includes(key))||typeof row.from!=="string"||typeof row.to!=="string"||row.from.length>60||row.to.length>60||(row.point_of_sale!==undefined&&(typeof row.point_of_sale!=="string"||row.point_of_sale.length>60))))return false;
 }
 return true;
}
