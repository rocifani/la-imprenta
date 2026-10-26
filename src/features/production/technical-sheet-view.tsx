import {compositionFields,technicalFields,type TechnicalSheet} from "./technical-sheet";
export function TechnicalSheetView({sheet={}}:{sheet?:TechnicalSheet}){
 const entries=technicalFields.filter(([key])=>sheet[key]?.trim());const rows=sheet.composition??[];const ranges=sheet.number_ranges??[];
 if(!entries.length&&!rows.length&&!ranges.length)return <p className="field-help">Todavía no se completó la ficha técnica estructurada.</p>;
 return <div className="technical-sheet"><h3>Ficha técnica de producción</h3>{rows.length>0&&<div className="users-table-wrap"><table className="users-table technical-table"><caption>Composición del trabajo</caption><thead><tr>{compositionFields.map(([key,label])=><th scope="col" key={key}>{label}</th>)}</tr></thead><tbody>{rows.map((row,index)=><tr key={index}>{compositionFields.map(([key])=><td key={key}>{row[key]||"—"}</td>)}</tr>)}</tbody></table></div>}
 <dl className="data-grid">{entries.map(([key,label])=><div key={key}><dt>{label}</dt><dd className="specification-text">{sheet[key]}</dd></div>)}</dl>{ranges.length>0&&<><h4>Numeración</h4><ul>{ranges.map((range,index)=><li key={index}>Desde {range.from||"sin indicar"} hasta {range.to||"sin indicar"}</li>)}</ul></>}</div>;
}
