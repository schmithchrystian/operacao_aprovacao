import { resolveMaterialDownload } from "@/server/services/materials";
import { isDomainError } from "@/server/errors";
export const runtime="nodejs";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{const {id}=await params;const url=await resolveMaterialDownload(id);return new Response(null,{status:302,headers:{Location:url,"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"}});}
 catch(error){const status=isDomainError(error)?error.code==="UNAUTHENTICATED"?401:error.code==="FORBIDDEN"?403:404:503;return Response.json({error:"Material indisponível."},{status,headers:{"Cache-Control":"no-store"}});}
}
