import { LESSON_COMPLETION_POINTS, LESSON_COMPLETION_XP } from "@/config/business";
import { auditLog } from "@/server/audit";
import { eventBus, type DomainEvent } from "@/server/events";
import { findPointTransactionByIdempotencyKey, recordLessonCompletedAward } from "./store";

/**
 * Consumidor MÍNIMO de gamificação (Fase 7): credita os pontos de "aula concluída" quando o
 * agente `study-tracking` emite `LessonCompleted`. Escopo estritamente limitado a este evento —
 * TODO(Fase 8 — agente `gamification`): expandir para `ModuleCompleted`/`CourseCompleted`/
 * `FlashcardCorrect`/`PomodoroCompleted`/streak/níveis/ranking, e mover o store para
 * repositórios formais (ver `./store.ts`).
 */
export interface LessonCompletedPayload {
  userId: string;
  lessonId: string;
  lessonTitle: string;
}

/**
 * IDEMPOTENTE em DUAS camadas (docs/DATA-MODEL.md, "Gamificação"): o `InMemoryEventBus` já
 * ignora reemissões da mesma `idempotencyKey` (não invoca handlers duas vezes); este handler
 * TAMBÉM verifica antes de gravar, como segunda barreira — equivalente à constraint única de
 * `PointTransaction.idempotencyKey` no schema real. Isso protege mesmo se, no futuro, o
 * handler vier a ser chamado fora do `EventBus` (ex.: reprocessamento manual).
 */
export async function handleLessonCompleted(
  event: DomainEvent<LessonCompletedPayload>,
): Promise<void> {
  const { userId, lessonId, lessonTitle } = event.payload;

  if (findPointTransactionByIdempotencyKey(event.idempotencyKey)) {
    return;
  }

  recordLessonCompletedAward({
    userId,
    lessonId,
    lessonTitle,
    idempotencyKey: event.idempotencyKey,
    points: LESSON_COMPLETION_POINTS,
    xp: LESSON_COMPLETION_XP,
  });

  auditLog({
    operation: "gamification.award-lesson-completed",
    userId,
    entity: "PointTransaction",
    entityId: lessonId,
    result: "success",
    correlationId: event.idempotencyKey,
  });
}

let registered = false;

/**
 * Registra este consumidor no barramento de eventos (ADR-0007). Idempotente por processo —
 * chamadas repetidas (ex.: hot-reload em dev, múltiplos imports) não duplicam a inscrição do
 * handler, o que evitaria conceder pontos duas vezes numa única emissão.
 *
 * TODO(Fase 8): mover para um bootstrap central de registro de consumidores em vez de ser
 * chamado a partir do próprio serviço de origem (`study-tracking`).
 */
export function registerGamificationEventHandlers(): void {
  if (registered) {
    return;
  }
  eventBus.subscribe<LessonCompletedPayload>("LessonCompleted", handleLessonCompleted);
  registered = true;
}
