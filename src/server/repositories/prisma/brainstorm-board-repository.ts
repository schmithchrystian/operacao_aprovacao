import type { BrainstormBoard } from "@/generated/prisma/client";
import type { BrainstormBoardRepository, BrainstormBoardCreateInput, BrainstormBoardEntity } from "../contracts/brainstorm-board-repository";
const map = (r: BrainstormBoard): BrainstormBoardEntity => ({...r, createdAt:r.createdAt.toISOString(), updatedAt:r.updatedAt.toISOString()});
export class PrismaBrainstormBoardRepository implements BrainstormBoardRepository {
  async findById(id:string) { const {prisma}=await import("@/server/db/prisma"); const r=await prisma.brainstormBoard.findFirst({where:{id,deletedAt:null}});return r?map(r):null; }
  async listByUserId(userId:string) { const {prisma}=await import("@/server/db/prisma");return (await prisma.brainstormBoard.findMany({where:{userId,deletedAt:null},orderBy:{createdAt:'desc'}})).map(map); }
  async create({now,...input}:BrainstormBoardCreateInput) {const {prisma}=await import("@/server/db/prisma");return map(await prisma.brainstormBoard.create({data:{...input,createdAt:now,updatedAt:now}}));}
}
