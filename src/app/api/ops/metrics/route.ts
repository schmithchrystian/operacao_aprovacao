import { timingSafeEqual } from "node:crypto";
import { env } from "@/config/env";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 const provided=Buffer.from(request.headers.get("authorization")??""),expected=Buffer.from(`Bearer ${env.CRON_SECRET}`);
 if(provided.length!==expected.length||!timingSafeEqual(provided,expected))return Response.json({error:"unauthorized"},{status:401});
 if(env.DATA_SOURCE!=="prisma")return Response.json({error:"unavailable"},{status:503});
 try{
  const {prisma}=await import("@/server/db/prisma");
  const [queued,failed,oldest,ranking]=await Promise.all([
   prisma.accountEmailOutbox.count({where:{status:"PENDING"}}),
   prisma.accountEmailOutbox.count({where:{status:"FAILED"}}),
   prisma.accountEmailOutbox.findFirst({where:{status:"PENDING"},orderBy:{createdAt:"asc"},select:{createdAt:true}}),
   prisma.rankingSnapshot.aggregate({_max:{calculatedAt:true}}),
  ]);
  return Response.json({accountEmails:{queued,failed,oldestAgeSeconds:oldest?Math.max(0,Math.floor((Date.now()-oldest.createdAt.getTime())/1000)):null},rankingLastCalculatedAt:ranking._max.calculatedAt?.toISOString()??null},{headers:{"Cache-Control":"no-store"}});
 }catch{return Response.json({error:"unavailable"},{status:503,headers:{"Cache-Control":"no-store"}});}
}
