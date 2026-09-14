import type { FlashcardReview } from "@/generated/prisma/client";
import type { FlashcardReviewRepository, FlashcardReviewCreateInput, FlashcardReviewEntity } from "../contracts/flashcard-review-repository";
const map=(r:FlashcardReview):FlashcardReviewEntity=>({...r,reviewedAt:r.reviewedAt.toISOString(),nextReviewAt:r.nextReviewAt.toISOString()});
export class PrismaFlashcardReviewRepository implements FlashcardReviewRepository {
 async findLatestByUserAndFlashcard(userId:string,flashcardId:string){const {prisma}=await import("@/server/db/prisma");const r=await prisma.flashcardReview.findFirst({where:{userId,flashcardId},orderBy:[{reviewedAt:'desc'},{id:'desc'}]});return r?map(r):null;}
 async listLatestByUserIdForFlashcardIds(userId:string,flashcardIds:string[]){const {prisma}=await import("@/server/db/prisma");return(await prisma.flashcardReview.findMany({where:{userId,flashcardId:{in:flashcardIds}},distinct:['flashcardId'],orderBy:[{reviewedAt:'desc'},{id:'desc'}]})).map(map);}
 async listByUserId(userId:string){const {prisma}=await import("@/server/db/prisma");return(await prisma.flashcardReview.findMany({where:{userId},orderBy:{reviewedAt:'asc'}})).map(map);}
 async create({now,nextReviewAt,...input}:FlashcardReviewCreateInput){const {prisma}=await import("@/server/db/prisma");return map(await prisma.flashcardReview.create({data:{...input,nextReviewAt:new Date(nextReviewAt),reviewedAt:now}}));}
}
