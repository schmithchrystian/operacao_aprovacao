export async function listMaterialRecords(lessonId:string){
 const {prisma}=await import("@/server/db/prisma");return prisma.lessonMaterial.findMany({where:{lessonId,deletedAt:null},orderBy:{order:"asc"}});
}
export async function getMaterialRecord(id:string){const {prisma}=await import("@/server/db/prisma");return prisma.lessonMaterial.findFirst({where:{id,deletedAt:null,lesson:{deletedAt:null}}});}
export async function createMaterialRecord(lessonId:string,title:string,key:string){const {prisma}=await import("@/server/db/prisma");return prisma.lessonMaterial.create({data:{lessonId,title,url:`storage:${key}`,type:"PDF"}});}
