import {NextResponse} from "next/server";
import {getCompletedCustomerSummary,validId} from "@/features/sales/queries";
import {completedSummaryDocument} from "@/features/sales/completed-summary";
import {buildCompletedSummaryPdf} from "@/features/sales/completed-summary-pdf";
import {loadPdfAssets} from "@/features/sales/pdf-assets";
import {checkPdfAccess,privatePdfHeaders,pdfResponse,pdfErrorResponse} from "@/features/sales/pdf-response";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const denied=await checkPdfAccess();if(denied)return denied;
 const {id}=await params;if(!validId(id))return NextResponse.json({error:"El cliente no existe."},{status:404,headers:privatePdfHeaders});
 const summary=await getCompletedCustomerSummary(id);
 try{return pdfResponse(await buildCompletedSummaryPdf(completedSummaryDocument(summary),await loadPdfAssets()),`resumen-trabajos-terminados-${id}.pdf`);}catch(error){return pdfErrorResponse(error);}
}
