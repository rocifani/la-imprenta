import Link from "next/link";
import {requireFinance} from "@/features/finance/queries";
import {getSupplier} from "@/features/suppliers/queries";
import {PurchaseForm} from "@/features/suppliers/purchase-form";
export const metadata={title:"Registrar compra | La Imprenta"};
export default async function NewPurchasePage({searchParams}:{searchParams:Promise<{supplier_id?:string}>}){await requireFinance();const id=(await searchParams).supplier_id;const supplier=id?(await getSupplier(id)).contact:null;return <main className="business-page"><Link className="back-link" href={supplier?`/panel/proveedores/${supplier.id}`:"/panel/proveedores"}>← Proveedores</Link><h1>Registrar compra.</h1><section className="business-card"><PurchaseForm id={crypto.randomUUID()} initialSupplier={supplier}/></section></main>;}
