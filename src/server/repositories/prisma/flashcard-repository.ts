import type { Flashcard } from "@/generated/prisma/client";
import type { FlashcardRepository, FlashcardCreateInput, FlashcardEntity } from "../contracts/flashcard-repository";
const map=(r:Flashcard):FlashcardEntity=>({...r,createdAt:r.createdAt.toISOString(),updatedAt:r.updatedAt.toISOString(),deletedAt:r.deletedAt?.toISOString()??null});
export class PrismaFlashcardRepository implements FlashcardRepository {
 async findById(id:string){const {prisma}=await import("@/server/db/prisma");const r=await prisma.flashcard.findFirst({where:{id,status:'PUBLISHED',deletedAt:null,deck:{deletedAt:null}}});return r?map(r):null;}
 async listByDeckId(deckId:string){return this.listByDeckIds([deckId]);}
 async listByDeckIds(deckIds:string[]){const {prisma}=await import("@/server/db/prisma");return(await prisma.flashcard.findMany({where:{deckId:{in:deckIds},status:'PUBLISHED',deletedAt:null,deck:{deletedAt:null}},orderBy:{createdAt:'asc'}})).map(map);}
 async create({now,...input}:FlashcardCreateInput){const {prisma}=await import("@/server/db/prisma");return map(await prisma.flashcard.create({data:{...input,status:'PUBLISHED',createdAt:now,updatedAt:now}}));}
}
