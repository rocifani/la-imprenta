import Link from "next/link";
import {getSupplier} from "@/features/suppliers/queries";
import {CustomerForm} from "@/features/sales/customer-form";
export const metadata={title:"Editar proveedor | La Imprenta"};
export default async function EditSupplierPage({params}:{params:Promise<{id:string}>}){const {contact}=await getSupplier((await params).id);return <main className="business-page"><Link className="back-link" href={`/panel/proveedores/${contact.id}`}>← Ficha del proveedor</Link><h1>Editar proveedor.</h1><section className="business-card"><CustomerForm id={contact.id} customer={contact} supplier/></section></main>;}
