import type { FlashcardDeck } from "@/generated/prisma/client";
import type {
  FlashcardDeckRepository,
  FlashcardDeckCreateInput,
  FlashcardDeckKind,
  FlashcardDeckEntity,
} from "../contracts/flashcard-deck-repository";
import { inRepositoryTransaction } from "../transaction";
const map = (r: FlashcardDeck): FlashcardDeckEntity => ({
  ...r,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});
export class PrismaFlashcardDeckRepository implements FlashcardDeckRepository {
  async findById(id: string) {
    const { prisma } = await import("@/server/db/prisma");
    const r = await prisma.flashcardDeck.findFirst({ where: { id, deletedAt: null } });
    return r ? map(r) : null;
  }
  async listSystemDecks() {
    const { prisma } = await import("@/server/db/prisma");
    return (
      await prisma.flashcardDeck.findMany({
        where: { userId: null, kind: "SUBJECT", isPublic: true, deletedAt: null },
        orderBy: { title: "asc" },
      })
    ).map(map);
  }
  async listByUserId(userId: string) {
    const { prisma } = await import("@/server/db/prisma");
    return (
      await prisma.flashcardDeck.findMany({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: "asc" },
      })
    ).map(map);
  }
  async findByUserIdAndKind(userId: string, kind: FlashcardDeckKind) {
    const { prisma } = await import("@/server/db/prisma");
    const r = await prisma.flashcardDeck.findFirst({ where: { userId, kind, deletedAt: null } });
    return r ? map(r) : null;
  }
  async create({ now, ...input }: FlashcardDeckCreateInput) {
    const special = input.userId && ["ERRORS", "NOTES"].includes(input.kind);
    try {
      return await inRepositoryTransaction(async () => {
        const { prisma } = await import("@/server/db/prisma");
        if (special) {
          await prisma.$queryRaw`SELECT "id" FROM "User" WHERE "id"=${input.userId} FOR UPDATE`;
          const existing = await this.findByUserIdAndKind(input.userId!, input.kind);
          if (existing) return existing;
        }
        return map(
          await prisma.flashcardDeck.create({ data: { ...input, createdAt: now, updatedAt: now } }),
        );
      });
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error ? error.code : null;
      if (special && code === "P2002") {
        const existing = await this.findByUserIdAndKind(input.userId!, input.kind);
        if (existing) return existing;
      }
      throw error;
    }
  }
}
