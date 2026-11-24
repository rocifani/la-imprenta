import {notFound} from "next/navigation";
import {requireFinance} from "@/features/finance/queries";
import {validId} from "@/features/sales/queries";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import type {SupplierAccount} from "./types";
export async function getSupplier(id:string,offset=0){await requireFinance();if(!validId(id))notFound();const db=await createSupabaseServerClient();const {data,error}=await db.rpc("supplier_account",{p_id:id,p_offset:offset});if(error)throw new Error("No pudimos cargar el proveedor.");if(!data)notFound();return data as SupplierAccount;}
