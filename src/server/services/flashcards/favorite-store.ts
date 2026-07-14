import { mockStore } from "@/server/repositories/mock/mock-store";

/**
 * Favoritos de flashcard, por `(userId, flashcardId)` (Fase 14 — agente `backend`, CLAUDE.md §19).
 *
 * PENDÊNCIA DE SCHEMA (documentada também em `docs/FLASHCARDS.md`): favoritar precisa ser uma
 * relação POR USUÁRIO independente de quem é dono do cartão — inclusive para cartões de baralhos
 * de MATÉRIA, que são públicos/compartilhados entre TODOS os alunos (`FlashcardDeck.userId:
 * null`, docs/DATA-MODEL.md). `Flashcard.tags` (reaproveitado para a proveniência de
 * `createFromErrors`/`createFromNotes`, ver `./shared.ts`) NÃO serve para favoritos: marcar um
 * campo na entidade `Flashcard` compartilhada favoritaria o cartão para TODOS os alunos ao mesmo
 * tempo, não só para quem clicou (bug de vazamento entre usuários). O schema atual não tem uma
 * tabela `FlashcardFavorite` (só existe `QuestionFavorite` para questões, docs/DATA-MODEL.md) —
 * até essa migration existir, este módulo guarda a relação em memória de processo, MESMO
 * ESTILO/mesma justificativa de `@/server/services/brainstorm/flashcard-draft-store.ts` (conceito
 * ainda sem tabela própria → módulo simples em memória, deliberadamente FORA do padrão
 * contracts/mock/prisma + container — ADR-0002 — porque não é uma entidade real do schema).
 *
 * Pendência explícita para o agente `database`: adicionar `FlashcardFavorite { userId,
 * flashcardId, createdAt } @@id([userId, flashcardId])` (espelhando `QuestionFavorite`) numa
 * migration futura e substituir este módulo por um `FlashcardFavoriteRepository` real (contracts
 * + mock + prisma + container), sem mudar a assinatura das funções abaixo.
 *
 * Estado via `mockStore` (`@/server/repositories/mock/mock-store`) — compartilhado entre
 * instâncias de módulo (Next.js 16/Turbopack).
 */
export interface FlashcardFavoriteEntry {
  userId: string;
  flashcardId: string;
  createdAt: string;
}

const favorites = mockStore<FlashcardFavoriteEntry[]>("flashcard-favorite", () => []);

export function isFavorite(userId: string, flashcardId: string): boolean {
  return favorites.some((entry) => entry.userId === userId && entry.flashcardId === flashcardId);
}

/** Todos os `flashcardId` favoritados por `userId` (qualquer baralho). */
export function listFavoriteFlashcardIds(userId: string): string[] {
  return favorites.filter((entry) => entry.userId === userId).map((entry) => entry.flashcardId);
}

/** Alterna o favorito (cria se não existir, remove se existir). Retorna o novo estado —
 *  mesmo formato de `QuestionFavoriteRepository.toggle`. */
export function toggleFavorite(userId: string, flashcardId: string, now: Date): boolean {
  const index = favorites.findIndex((entry) => entry.userId === userId && entry.flashcardId === flashcardId);
  if (index >= 0) {
    favorites.splice(index, 1);
    return false;
  }
  favorites.push({ userId, flashcardId, createdAt: now.toISOString() });
  return true;
}

/** Uso exclusivo de testes — restaura o store ao estado inicial (vazio). */
export function __resetFlashcardFavoriteStore(): void {
  favorites.splice(0, favorites.length);
}
