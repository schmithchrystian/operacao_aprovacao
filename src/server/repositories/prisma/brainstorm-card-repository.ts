import type { BrainstormCard } from "@/generated/prisma/client";
import { ValidationError } from "@/server/errors";
import type { BrainstormCardRepository, BrainstormCardCreateInput, BrainstormCardUpdateInput, BrainstormCardEntity } from "../contracts/brainstorm-card-repository";
import { inRepositoryTransaction } from "../transaction";
const map = (r:BrainstormCard):BrainstormCardEntity=>({...r,createdAt:r.createdAt.toISOString(),updatedAt:r.updatedAt.toISOString()});
export class PrismaBrainstormCardRepository implements BrainstormCardRepository {
 async findById(id:string){const {prisma}=await import("@/server/db/prisma");const r=await prisma.brainstormCard.findFirst({where:{id,deletedAt:null,column:{deletedAt:null,board:{deletedAt:null}}}});return r?map(r):null;}
 async listByColumnIds(columnIds:string[]){const {prisma}=await import("@/server/db/prisma");return(await prisma.brainstormCard.findMany({where:{columnId:{in:columnIds},deletedAt:null,column:{deletedAt:null,board:{deletedAt:null}}},orderBy:[{columnId:'asc'},{order:'asc'}]})).map(map);}
 async create({now,...input}:BrainstormCardCreateInput){const {prisma}=await import("@/server/db/prisma");return map(await prisma.brainstormCard.create({data:{...input,createdAt:now,updatedAt:now}}));}
 async update({id,now,...data}:BrainstormCardUpdateInput){const {prisma}=await import("@/server/db/prisma");return map(await prisma.brainstormCard.update({where:{id,deletedAt:null},data:{...data,updatedAt:now}}));}
 async reorderColumn(columnId:string,orderedCardIds:string[],now:Date){return inRepositoryTransaction(async()=>{const {prisma}=await import("@/server/db/prisma");if(new Set(orderedCardIds).size!==orderedCardIds.length)throw new ValidationError('Cartões duplicados na ordem.');for(const [order,id]of orderedCardIds.entries())await prisma.brainstormCard.updateMany({where:{id,columnId,deletedAt:null},data:{order,updatedAt:now}});return this.listByColumnIds([columnId]);});}
 async moveToColumn(cardId:string,toColumnId:string,now:Date){return inRepositoryTransaction(async()=>{const {prisma}=await import("@/server/db/prisma");const card=await prisma.brainstormCard.findUniqueOrThrow({where:{id:cardId},include:{column:true}});const target=await prisma.brainstormColumn.findUniqueOrThrow({where:{id:toColumnId}});if(card.column.boardId!==target.boardId||target.deletedAt)throw new ValidationError('Destino fora do quadro.');return map(await prisma.brainstormCard.update({where:{id:cardId},data:{columnId:toColumnId,updatedAt:now}}));});}
 async delete(id:string){const {prisma}=await import("@/server/db/prisma");await prisma.brainstormCard.update({where:{id},data:{deletedAt:new Date()}});}
}
