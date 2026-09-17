import type { BrainstormColumn } from "@/generated/prisma/client";
import type { BrainstormColumnRepository, BrainstormColumnCreateInput, BrainstormColumnEntity } from "../contracts/brainstorm-column-repository";
import { inRepositoryTransaction } from "../transaction";
const map = (r: BrainstormColumn): BrainstormColumnEntity => ({...r,createdAt:r.createdAt.toISOString(),updatedAt:r.updatedAt.toISOString()});
export class PrismaBrainstormColumnRepository implements BrainstormColumnRepository {
 async findById(id:string){const {prisma}=await import("@/server/db/prisma");const r=await prisma.brainstormColumn.findFirst({where:{id,deletedAt:null,board:{deletedAt:null}}});return r?map(r):null;}
 async listByBoardId(boardId:string){const {prisma}=await import("@/server/db/prisma");return(await prisma.brainstormColumn.findMany({where:{boardId,deletedAt:null,board:{deletedAt:null}},orderBy:{order:'asc'}})).map(map);}
 async createMany(inputs:BrainstormColumnCreateInput[]){return inRepositoryTransaction(async()=>{const {prisma}=await import("@/server/db/prisma");const rows:BrainstormColumnEntity[]=[];for(const {now,...input} of inputs)rows.push(map(await prisma.brainstormColumn.create({data:{...input,createdAt:now,updatedAt:now}})));return rows;});}
}
