/**
 * Store mock MÍNIMO de gamificação (Fase 7 — só o evento `LessonCompleted`; TODO Fase 8:
 * mover para `src/server/repositories/{contracts,mock,prisma}` seguindo o mesmo padrão dos
 * demais domínios (ADR-0002), quando o agente `gamification` expandir para
 * módulo/curso/flashcard/streak/níveis/ranking).
 *
 * Espelha `GamificationEvent`/`PointTransaction` (docs/DATA-MODEL.md, "Gamificação"): o
 * ledger de pontos é IMUTÁVEL (nenhuma linha é atualizada após criada) e a idempotência é
 * garantida por `idempotencyKey` única em ambas as tabelas — aqui replicada como checagem
 * antes de inserir (segunda barreira, além da do próprio `EventBus`).
 */
export interface GamificationEventRecord {
  id: string;
  userId: string;
  type: "LESSON_COMPLETED";
  idempotencyKey: string;
  sourceType: "LESSON";
  sourceId: string;
  points: number;
  xp: number;
  ruleVersion: number;
  status: "PROCESSED";
  createdAt: string;
}

export interface PointTransactionRecord {
  id: string;
  userId: string;
  gamificationEventId: string;
  idempotencyKey: string;
  type: "EARN";
  points: number;
  xp: number;
  reason: string;
  createdAt: string;
}

const gamificationEvents: GamificationEventRecord[] = [];
const pointTransactions: PointTransactionRecord[] = [];
let sequence = 0;

export function findPointTransactionByIdempotencyKey(key: string): PointTransactionRecord | null {
  return pointTransactions.find((transaction) => transaction.idempotencyKey === key) ?? null;
}

export interface RecordLessonCompletedAwardInput {
  userId: string;
  lessonId: string;
  lessonTitle: string;
  idempotencyKey: string;
  points: number;
  xp: number;
}

/**
 * Grava o `GamificationEvent` + `PointTransaction` de uma aula concluída. IDEMPOTENTE: se já
 * existir uma transação com a mesma `idempotencyKey`, devolve a existente sem gravar de novo
 * (nunca recredita — CLAUDE.md §15/§25).
 */
export function recordLessonCompletedAward(
  input: RecordLessonCompletedAwardInput,
): PointTransactionRecord {
  const existing = findPointTransactionByIdempotencyKey(input.idempotencyKey);
  if (existing) {
    return existing;
  }

  sequence += 1;
  const createdAt = new Date().toISOString();
  const eventId = `gam-evt-mock-${sequence}`;

  const event: GamificationEventRecord = {
    id: eventId,
    userId: input.userId,
    type: "LESSON_COMPLETED",
    idempotencyKey: input.idempotencyKey,
    sourceType: "LESSON",
    sourceId: input.lessonId,
    points: input.points,
    xp: input.xp,
    ruleVersion: 1,
    status: "PROCESSED",
    createdAt,
  };
  gamificationEvents.push(event);

  const transaction: PointTransactionRecord = {
    id: `pt-mock-${sequence}`,
    userId: input.userId,
    gamificationEventId: eventId,
    idempotencyKey: input.idempotencyKey,
    type: "EARN",
    points: input.points,
    xp: input.xp,
    reason: `Aula concluída: ${input.lessonTitle}`,
    createdAt,
  };
  pointTransactions.push(transaction);

  return transaction;
}

export function listPointTransactionsByUserId(userId: string): PointTransactionRecord[] {
  return pointTransactions.filter((transaction) => transaction.userId === userId);
}

export function listGamificationEventsByUserId(userId: string): GamificationEventRecord[] {
  return gamificationEvents.filter((event) => event.userId === userId);
}

/** Uso exclusivo de testes — limpa o store mock. */
export function __resetGamificationMockStore(): void {
  gamificationEvents.length = 0;
  pointTransactions.length = 0;
  sequence = 0;
}
