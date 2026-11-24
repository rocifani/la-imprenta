import Link from "next/link";
import {requireFinance} from "@/features/finance/queries";
import {MovementForm} from "@/features/finance/movement-form";
import {getSupplier} from "@/features/suppliers/queries";
export const metadata={title:"Registrar egreso | La Imprenta"};
export default async function NewExpensePage({searchParams}:{searchParams:Promise<{supplier_id?:string}>}){await requireFinance();const id=(await searchParams).supplier_id;const supplier=id?(await getSupplier(id)).contact:null;return <main className="business-page"><Link className="back-link" href={supplier?`/panel/proveedores/${supplier.id}`:"/panel/finanzas"}>← {supplier?"Ficha del proveedor":"Finanzas"}</Link><h1>{supplier?"Registrar pago al proveedor.":"Registrar egreso."}</h1><section className="business-card"><MovementForm id={crypto.randomUUID()} initialSupplier={supplier}/></section></main>;}
