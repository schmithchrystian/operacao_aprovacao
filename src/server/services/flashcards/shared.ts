import { NotFoundError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import type { FlashcardDeckEntity, FlashcardDeckKind } from "@/server/repositories/contracts/flashcard-deck-repository";
import type { FlashcardEntity } from "@/server/repositories/contracts/flashcard-repository";
import type { FlashcardReviewEntity } from "@/server/repositories/contracts/flashcard-review-repository";

/**
 * Helpers compartilhados pelos serviços de Flashcards (Fase 14) — acesso/autorização a
 * baralhos/cartões, marcações reservadas de proveniência e cálculo de "devido". Mesmo papel de
 * `@/server/services/brainstorm/shared.ts` para o domínio de Brainstorm.
 */

// ---------------------------------------------------------------------------
// Acesso a baralhos/cartões
// ---------------------------------------------------------------------------

/** Um baralho é LEGÍVEL (revisável/favoritável) por `userId` quando é do sistema/público
 *  (`userId: null`) OU pertence ao próprio usuário. */
export function canAccessDeck(deck: FlashcardDeckEntity, userId: string): boolean {
  return deck.userId === null || deck.userId === userId;
}

/**
 * Resolve um baralho garantindo que é LEGÍVEL por `userId` (público OU próprio) — lança
 * `NotFoundError` (nunca `ForbiddenError`) quando não existe ou é um baralho pessoal de outro
 * usuário, para não confirmar a existência de um baralho alheio (mesmo padrão anti-IDOR de
 * `@/server/services/brainstorm/shared.ts#loadOwnedBoard`).
 */
export async function loadAccessibleDeck(userId: string, deckId: string): Promise<FlashcardDeckEntity> {
  const repos = getRepositories();
  const deck = await repos.flashcardDecks.findById(deckId);
  if (!deck || !canAccessDeck(deck, userId)) {
    throw new NotFoundError("Baralho não encontrado.");
  }
  return deck;
}

/** Resolve um baralho garantindo que PERTENCE a `userId` (nunca um baralho público/de outro
 *  usuário) — usado para mutações (`createCard`), diferente de `loadAccessibleDeck` (leitura). */
export async function loadOwnedDeck(userId: string, deckId: string): Promise<FlashcardDeckEntity> {
  const repos = getRepositories();
  const deck = await repos.flashcardDecks.findById(deckId);
  if (!deck || deck.userId !== userId) {
    throw new NotFoundError("Baralho não encontrado.");
  }
  return deck;
}

/** Resolve um cartão + o baralho que o contém, garantindo que o baralho é LEGÍVEL por `userId`. */
export async function loadReviewableFlashcard(
  userId: string,
  flashcardId: string,
): Promise<{ card: FlashcardEntity; deck: FlashcardDeckEntity }> {
  const repos = getRepositories();
  const card = await repos.flashcards.findById(flashcardId);
  if (!card) {
    throw new NotFoundError("Cartão não encontrado.");
  }
  const deck = await loadAccessibleDeck(userId, card.deckId);
  return { card, deck };
}

/**
 * Retorna (criando se necessário) o baralho pessoal de `kind` para `userId` — get-or-create
 * IDEMPOTENTE (no máximo um baralho por `(userId, kind)`, ver
 * `FlashcardDeckRepository.findByUserIdAndKind`). Usado por `createFromErrors`/`createFromNotes`
 * para nunca criar um 2º baralho "Criados do caderno de erros"/"Criados de anotações" do mesmo
 * usuário ao serem chamados de novo.
 */
export async function getOrCreatePersonalDeck(
  userId: string,
  kind: Extract<FlashcardDeckKind, "ERRORS" | "NOTES">,
  title: string,
  now: Date,
): Promise<FlashcardDeckEntity> {
  const repos = getRepositories();
  const existing = await repos.flashcardDecks.findByUserIdAndKind(userId, kind);
  if (existing) return existing;
  return repos.flashcardDecks.create({ userId, subjectId: null, title, isPublic: false, kind, now });
}

// ---------------------------------------------------------------------------
// Marcações reservadas de proveniência (tags) — ver docs/FLASHCARDS.md
// ---------------------------------------------------------------------------

/**
 * `Flashcard.tags` (docs/DATA-MODEL.md) é reaproveitado, além de tags genuínas do aluno, para
 * marcar de qual item de origem um cartão AUTO-IMPORTADO veio (`createFromErrors`/
 * `createFromNotes`) — SEM exigir uma coluna nova no schema (`Flashcard` não tem
 * `sourceQuestionId`/`sourceDraftId` — pendência registrada em `docs/FLASHCARDS.md` para o
 * agente `database` avaliar numa migration futura). Isso é o que torna as duas importações
 * IDEMPOTENTES: antes de criar um cartão para uma questão/rascunho, o serviço verifica se já
 * existe um cartão com a tag reservada correspondente no baralho de destino.
 *
 * Reservadas de propósito com um prefixo (`src:`) que nenhuma tag genuína do aluno usaria
 * (`createFlashcardInputSchema`/`createCardInputSchema` de Brainstorm não proíbem `:`, mas o
 * prefixo + a lista fixa de origens tornam a colisão acidental praticamente impossível) — SEMPRE
 * filtradas de `FlashcardDTO.tags` (`@/server/services/flashcards/mappers.ts`), nunca vazam para
 * o cliente como se fossem tags de conteúdo.
 */
const RESERVED_TAG_PREFIX = {
  errorNotebook: "src:error:",
  brainstormNote: "src:note:",
} as const;

export function errorSourceTag(questionId: string): string {
  return `${RESERVED_TAG_PREFIX.errorNotebook}${questionId}`;
}

export function noteSourceTag(draftId: string): string {
  return `${RESERVED_TAG_PREFIX.brainstormNote}${draftId}`;
}

export function isReservedTag(tag: string): boolean {
  return tag.startsWith("src:");
}

/** Remove as marcações reservadas antes de expor `tags` num DTO (nunca vaza para o cliente). */
export function publicTags(tags: readonly string[]): string[] {
  return tags.filter((tag) => !isReservedTag(tag));
}

// ---------------------------------------------------------------------------
// "Devido" (due) — comparação de `nextReviewAt` da última revisão contra `now`
// ---------------------------------------------------------------------------

/** `true` quando o cartão nunca foi revisado por este usuário OU sua próxima revisão já chegou
 *  (`nextReviewAt <= now`). Cartão nunca revisado = devido IMEDIATAMENTE (cartão novo). */
export function isCardDue(latestReview: FlashcardReviewEntity | undefined, now: Date): boolean {
  if (!latestReview) return true;
  return Date.parse(latestReview.nextReviewAt) <= now.getTime();
}

/** Instante usado para ORDENAR por prioridade de revisão: a próxima revisão devida, ou
 *  `card.createdAt` para um cartão nunca revisado (mais antigo criado primeiro). Quanto mais
 *  antigo esse instante, maior a prioridade (mais atrasado/mais tempo esperando). */
export function dueSince(card: FlashcardEntity, latestReview: FlashcardReviewEntity | undefined): string {
  return latestReview?.nextReviewAt ?? card.createdAt;
}

/** Monta um Map `flashcardId -> última revisão` a partir de uma lista de baralhos/cartões — uma
 *  única chamada em lote ao repositório (evita 1 query por cartão em `listDecks`/`getReviewSession`). */
export async function loadLatestReviewsByFlashcardId(
  userId: string,
  flashcardIds: readonly string[],
): Promise<Map<string, FlashcardReviewEntity>> {
  if (flashcardIds.length === 0) return new Map();
  const repos = getRepositories();
  const reviews = await repos.flashcardReviews.listLatestByUserIdForFlashcardIds(userId, [...flashcardIds]);
  return new Map(reviews.map((review) => [review.flashcardId, review]));
}
