import {createSupabaseServerClient} from "@/lib/supabase/server";
export type ProductionMember={id:string;display_name:string};
export async function getProductionTeam(){const db=await createSupabaseServerClient();const {data,error}=await db.rpc("production_team");if(error)throw new Error("No pudimos cargar los responsables de Producción.");return data as ProductionMember[];}
