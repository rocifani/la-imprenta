import Link from "next/link";
import {requireFinance} from "@/features/finance/queries";
import {CustomerForm} from "@/features/sales/customer-form";
import {SupplierLinkForm} from "@/features/suppliers/link-form";
export const metadata={title:"Nuevo proveedor | La Imprenta"};
export default async function NewSupplierPage(){await requireFinance();return <main className="business-page"><Link className="back-link" href="/panel/proveedores">← Proveedores</Link><h1>Nuevo proveedor.</h1><SupplierLinkForm/><section className="business-card"><h2>Crear una ficha nueva</h2><CustomerForm id={crypto.randomUUID()} supplier/></section></main>;}
