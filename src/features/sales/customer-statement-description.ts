import type {CustomerStatement} from "./completed-summary";
import {documentNumber,formatMoney} from "./money";
import {methodLabels} from "@/features/finance/shared";
export function statementDescription(e:CustomerStatement["entries"][number]){
 if(e.kind==="order")return documentNumber("NP",e.number!)+(e.description?" · "+e.description:"");
 if(e.kind==="purchase")return documentNumber("CP",e.number!)+(e.description?" · "+e.description:"");
 const method=methodLabels[e.method as keyof typeof methodLabels]??e.method;
 const label=(e.kind==="deposit"?"Seña":e.kind==="supplier_payment"?"Pago al proveedor":"Cobro")+(method?" · "+method:"");
 const applied=e.allocations.map(a=>documentNumber("NP",a.number)+": "+formatMoney(a.amount)).join("; ");
 return label+(applied?". Aplicado a "+applied:"");
}
