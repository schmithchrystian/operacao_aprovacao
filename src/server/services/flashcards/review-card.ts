import type { FlashcardDTO, FlashcardRating } from "@/contracts/flashcards";
import { auditLog } from "@/server/audit";
import { assertOwnership, requireUser } from "@/server/authorization";
import { ConflictError } from "@/server/errors";
import { eventBus } from "@/server/events";
import { getRepositories } from "@/server/repositories";
import {
  buildIdempotencyKey,
  registerGamificationEventHandlers,
  type FlashcardCorrectPayload,
} from "@/server/services/gamification";
import { toFlashcardDTO } from "./mappers";
import { reviewLockKey, withReviewLock } from "./review-lock";
import { loadReviewableFlashcard } from "./shared";
import { addIntervalDays, computeNextReview, isCorrectRating, NEW_CARD_STATE } from "./spaced-repetition";

/**
 * Registra os consumidores de gamificação assim que este módulo é carregado — mesmo padrão de
 * `study-tracking/record-heartbeat.ts`/`simulations/submit-and-finalize.ts` (idempotente; seguro
 * com múltiplos imports/hot-reload). Este é o EMISSOR REAL de `FlashcardCorrect` (o handler já
 * existia pronto desde a Fase 8, `@/server/services/gamification/handlers.ts`, aguardando esta
 * fase — ver TODO em `.../gamification/events.ts`).
 */
registerGamificationEventHandlers();

/**
 * Registra uma revisão de flashcard: aplica a classificação do aluno (Errei/Difícil/Médio/Fácil)
 * ao algoritmo de repetição espaçada (`./spaced-repetition.ts`), grava a nova linha de
 * `FlashcardReview` (append-only) e, se a revisão contou como ACERTO, emite `FlashcardCorrect`
 * (5 pontos, CLAUDE.md §15) de forma idempotente.
 *
 * REGRAS DURAS, na ordem:
 * 1. Autorização: `requireUser` + `assertOwnership` + `loadReviewableFlashcard` (o cartão precisa
 *    estar num baralho ACESSÍVEL — matéria pública ou baralho pessoal do próprio aluno — anti-IDOR).
 * 2. **Anti-farm (decisão desta fase, documentada em `docs/FLASHCARDS.md`)**: um cartão só pode
 *    ser revisado de novo quando `nextReviewAt` da última revisão já chegou (`<= now`) — cartão
 *    nunca revisado é sempre aceito (devido imediatamente). Sem esta checagem, o aluno poderia
 *    clicar "Fácil" repetidamente no mesmo cartão e gerar pontos ilimitados — a `idempotencyKey`
 *    por `reviewId` (abaixo) SOZINHA não impediria isso, porque cada clique cria uma linha
 *    `FlashcardReview` NOVA (com um `id` novo, logo uma `idempotencyKey` nova). O bloqueio real
 *    contra o "farm trivial" é este gate de "devido", nunca confiado ao cliente (CLAUDE.md §11)
 *    — a UI pode (e deve) evitar oferecer o botão de revisão para um cartão não devido, mas o
 *    SERVIDOR sempre reconfere, mesmo que a UI seja contornada.
 * 3. Cálculo 100% no servidor via `computeNextReview` (função pura) — `now` sempre injetado,
 *    nunca `Date.now()` direto aqui.
 * 4. **Atomicidade da seção crítica (correção do achado ALTO A1)**: os passos "ler última
 *    revisão → gate 'devido' → criar revisão → emitir FlashcardCorrect" rodam DENTRO de
 *    `withReviewLock` por chave `(userId, flashcardId)` (`./review-lock.ts`). Sem isso, K
 *    requisições concorrentes no mesmo cartão devido passariam todas o gate antes de qualquer
 *    `create` e cada uma creditaria 5 pontos (a `idempotencyKey` por `reviewId` NÃO deduplica —
 *    chaves diferentes por revisão). Com o lock, só a 1ª cria a revisão; as demais reavaliam o
 *    gate já com a revisão gravada e caem em `ConflictError`. Ver `./review-lock.ts` para o
 *    TODO(fase de banco) da solução definitiva (inserção condicional/row-lock).
 * 5. Idempotência da PONTUAÇÃO por submissão: `idempotencyKey = flashcard-correct:<userId>:<reviewId>`
 *    (`buildIdempotencyKey`, `@/server/services/gamification`) — chaveada pelo `id` da revisão
 *    RECÉM-CRIADA (não pelo `flashcardId`), porque cada revisão LEGÍTIMA (aceita pelo gate acima)
 *    deve pontuar — reprocessar o MESMO evento (ex.: reentrega de fila) nunca credita duas vezes,
 *    mas duas revisões DIFERENTES e legítimas do mesmo cartão, em dias diferentes, pontuam cada
 *    uma a sua vez (não é "pontuar 1x por cartão para sempre").
 * 6. "Acerto" = classificação !== Errei (Difícil/Médio/Fácil contam — `isCorrectRating`,
 *    `./spaced-repetition.ts`, decisão documentada lá).
 */
export async function reviewCard(
  userId: string,
  flashcardId: string,
  rating: FlashcardRating,
  now: Date = new Date(),
): Promise<FlashcardDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const { card, deck } = await loadReviewableFlashcard(userId, flashcardId);
  const repos = getRepositories();

  // Seção crítica serializada por (userId, flashcardId) — anti-farm por corrida (achado A1).
  await withReviewLock(reviewLockKey(userId, flashcardId), async () => {
    const latestReview = await repos.flashcardReviews.findLatestByUserAndFlashcard(userId, flashcardId);

    if (latestReview && Date.parse(latestReview.nextReviewAt) > now.getTime()) {
      throw new ConflictError("Este cartão ainda não está disponível para revisão.");
    }

    const currentState = latestReview
      ? {
          easeFactor: latestReview.easeFactor,
          intervalDays: latestReview.intervalDays,
          repetition: latestReview.repetition,
        }
      : NEW_CARD_STATE;

    const nextState = computeNextReview(currentState, rating);
    const nextReviewAt = addIntervalDays(now, nextState.intervalDays).toISOString();

    const review = await repos.flashcardReviews.create({
      userId,
      flashcardId,
      rating,
      intervalDays: nextState.intervalDays,
      easeFactor: nextState.easeFactor,
      repetition: nextState.repetition,
      nextReviewAt,
      now,
    });

    const correct = isCorrectRating(rating);
    if (correct) {
      await eventBus.emit<FlashcardCorrectPayload>({
        type: "FlashcardCorrect",
        payload: { userId, flashcardId, reviewId: review.id },
        idempotencyKey: buildIdempotencyKey("FLASHCARD_CORRECT", userId, review.id),
        occurredAt: now,
      });
    }

    await auditLog({
      operation: "flashcards.review-card",
      userId,
      entity: "FlashcardReview",
      entityId: review.id,
      result: "success",
      correlationId: review.id,
      metadata: { flashcardId, rating, correct, intervalDays: nextState.intervalDays },
    });
  });

  return toFlashcardDTO(card, userId, now, deck);
}
