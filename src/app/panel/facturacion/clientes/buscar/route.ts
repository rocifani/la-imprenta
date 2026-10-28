import {NextRequest,NextResponse} from "next/server";
import {getTeamAccess} from "@/features/auth/team-access";
import {createSupabaseServerClient} from "@/lib/supabase/server";
export async function GET(request:NextRequest){
 const headers={"Cache-Control":"private, no-store"};
 const access=await getTeamAccess();
 if(access.status!=="allowed") return NextResponse.json({error:"Necesitás ingresar."},{status:401,headers});
 if(!access.roles.includes("billing")) return NextResponse.json({error:"Sin permiso."},{status:403,headers});
 const db=await createSupabaseServerClient();
 const {data,error}=await db.rpc("billing_customers",{p_query:(request.nextUrl.searchParams.get("q")??"").slice(0,100).trim()});
 if(error) return NextResponse.json({error:"No se pudo buscar."},{status:503,headers});
 return NextResponse.json({customers:data},{headers});
}
