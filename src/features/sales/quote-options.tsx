import {ItemTable} from "./item-table";
import {formatMoney} from "./money";
import type {QuoteAlternative} from "./types";
export function QuoteOptions({options,selected}:{options:QuoteAlternative[];selected?:string|null}){
 return <>{options.map(option=><section className="quote-option" key={option.id}><div className="card-title-row"><h2>{option.name}</h2>{selected===option.id&&<span className="status-badge active">Alternativa aprobada</span>}</div><ItemTable items={option.items}/><div className="quote-total"><span>Total de la alternativa · ARS</span><strong>{formatMoney(option.items.reduce((sum,item)=>sum+Math.round(Number(item.amount)*100),0)/100)}</strong></div></section>)}</>;
}
