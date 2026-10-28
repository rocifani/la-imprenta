import {NextResponse} from "next/server";
import {getWorkshopOrder} from "@/features/production/queries";
import {workshopDocument} from "@/features/production/workshop-document";
import {buildWorkshopPdf} from "@/features/production/workshop-pdf";
import {validId} from "@/features/sales/queries";
import {loadPdfAssets} from "@/features/sales/pdf-assets";
import {checkPdfAccess,privatePdfHeaders,pdfResponse,pdfErrorResponse} from "@/features/sales/pdf-response";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const denied=await checkPdfAccess(["designer","operator"]);if(denied)return denied;const {id}=await params;if(!validId(id))return NextResponse.json({error:"La nota no existe."},{status:404,headers:privatePdfHeaders});
 const order=await getWorkshopOrder(id);try{return pdfResponse(await buildWorkshopPdf(workshopDocument(order),await loadPdfAssets()),`ficha-taller-NP-${String(order.number).padStart(6,"0")}.pdf`);}catch(error){return pdfErrorResponse(error);}
}
