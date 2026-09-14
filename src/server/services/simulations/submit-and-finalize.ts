import { inRepositoryTransaction } from "@/server/repositories/transaction";
import { SIMULATIONS } from "@/config/business";
import type { AttemptResultDTO, SubmitAnswersInput } from "@/contracts/simulations";
import { auditLog } from "@/server/audit";
import { assertOwnership, requireUser } from "@/server/authorization";
import { ConflictError, NotFoundError, ValidationError } from "@/server/errors";
import { eventBus } from "@/server/events";
import { getRepositories } from "@/server/repositories";
import {
  buildIdempotencyKey,
  registerGamificationEventHandlers,
  type MockExamCompletedPayload,
  type QuestionCorrectPayload,
} from "@/server/services/gamification";
import { buildAttemptResultDTO } from "./mappers";

/**
 * Registra os consumidores de gamificação assim que este módulo é carregado — mesmo padrão de
 * `study-tracking/record-heartbeat.ts` (idempotente; seguro com múltiplos imports/hot-reload).
 */
registerGamificationEventHandlers();

class AttemptExpiredError extends ConflictError {}

interface CorrectionEntry {
  questionId: string;
  selectedOptionId: string | null;
  isCorrect: boolean | null;
}

/**
 * Corrige e finaliza uma tentativa de simulado — o coração da Fase 10 (CLAUDE.md §18/§25).
 *
 * REGRAS DURAS aplicadas aqui, na ordem:
 * 1. Autorização: `requireUser` + `assertOwnership` duplo (usuário chamador E dono da
 *    tentativa) — anti-IDOR.
 * 2. Idempotência/anti-dupla-finalização: se a tentativa já não está `IN_PROGRESS`, rejeita
 *    IMEDIATAMENTE (cobre tanto "finalizar 2x" quanto "responder após finalização" — mesma
 *    checagem serve para os dois cenários do CLAUDE.md §25).
 * 3. Tempo validado no SERVIDOR: `SubmitAnswersInput` não tem nenhum campo de tempo — o
 *    decorrido é sempre `now - attempt.startedAt` (relógio do servidor). Estourar o limite (+
 *    tolerância) expira a tentativa e rejeita a submissão, sem corrigir nada.
 * 4. Correção 100% no servidor: `isCorrect` vem exclusivamente de `QuestionOption.isCorrect`
 *    (nunca de um campo do payload — `SubmitAnswersInput` nem possui esse campo).
 * 5. Ponto de linearização por concorrência otimista: `mockExamAttempts.finalize` só aplica a
 *    transição quando `version` ainda bate (docs/DATA-MODEL.md §5). Só quem vence essa CAS
 *    grava `QuestionAttempt`/emite eventos de gamificação — a chamada perdedora de uma corrida
 *    nunca produz pontuação parcial (CLAUDE.md §25: "falha transacional não gera pontuação
 *    parcial").
 */
async function submitAndFinalizeInTransaction(userId: string, input: SubmitAnswersInput): Promise<AttemptResultDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const repos = getRepositories();
  const attempt = await repos.mockExamAttempts.findById(input.attemptId);
  if (!attempt) {
    throw new NotFoundError("Tentativa não encontrada.");
  }
  assertOwnership(attempt.userId, userId);

  if (attempt.status !== "IN_PROGRESS") {
    throw new ConflictError("Esta tentativa já foi finalizada.");
  }

  const now = new Date();
  const elapsedSeconds = Math.floor((now.getTime() - Date.parse(attempt.startedAt)) / 1000);

  if (attempt.timeLimitSeconds !== null) {
    const maxAllowedSeconds = attempt.timeLimitSeconds + SIMULATIONS.timeOverageToleranceSeconds;
    if (elapsedSeconds > maxAllowedSeconds) {
      const expired = await repos.mockExamAttempts.expire({
        id: attempt.id,
        expectedVersion: attempt.version,
        now,
      });
      if (expired) {
        // Só audita a expiração quando ela DE FATO ocorreu (CAS venceu). Se `expire()` devolve
        // `null`, um finalize/expire concorrente já venceu a corrida — não logar um audit
        // enganoso de "expirado" para uma tentativa que na verdade foi finalizada por outra
        // chamada (achado de segurança Fase 10 — BAIXO).
        await auditLog({
          operation: "simulations.attempt-expired",
          userId,
          entity: "MockExamAttempt",
          entityId: attempt.id,
          result: "success",
          correlationId: attempt.id,
          metadata: { elapsedSeconds, timeLimitSeconds: attempt.timeLimitSeconds },
        });
      }
      throw new AttemptExpiredError("O tempo da tentativa foi esgotado.");
    }
  }

  const exam = await repos.mockExams.findById(attempt.mockExamId);
  if (!exam) {
    throw new NotFoundError("Simulado da tentativa não encontrado.");
  }

  const questionIdSet = new Set(exam.questionIds);
  const answerByQuestionId = new Map<string, string | null>();
  for (const answer of input.answers) {
    if (!questionIdSet.has(answer.questionId)) {
      throw new ValidationError("Questão informada não pertence a esta tentativa.");
    }
    answerByQuestionId.set(answer.questionId, answer.selectedOptionId);
  }

  let correctCount = 0;
  let wrongCount = 0;
  let blankCount = 0;
  const corrections: CorrectionEntry[] = [];

  for (const questionId of exam.questionIds) {
    const selectedOptionId = answerByQuestionId.get(questionId) ?? null;

    if (selectedOptionId === null) {
      blankCount += 1;
      corrections.push({ questionId, selectedOptionId: null, isCorrect: null });
      continue;
    }

    const options = await repos.questionOptions.listByQuestionId(questionId);
    const selectedOption = options.find((option) => option.id === selectedOptionId);
    if (!selectedOption) {
      throw new ValidationError(`Alternativa inválida para a questão ${questionId}.`);
    }

    // CORREÇÃO NO SERVIDOR — a única fonte de verdade é `QuestionOption.isCorrect`.
    const isCorrect = selectedOption.isCorrect;
    if (isCorrect) {
      correctCount += 1;
    } else {
      wrongCount += 1;
    }
    corrections.push({ questionId, selectedOptionId, isCorrect });
  }

  const totalQuestions = exam.questionIds.length;
  const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 10000) / 100 : 0;
  const timeSpentPerQuestion = totalQuestions > 0 ? Math.round(elapsedSeconds / totalQuestions) : null;

  const finalized = await repos.mockExamAttempts.finalize({
    id: attempt.id,
    expectedVersion: attempt.version,
    correctCount,
    wrongCount,
    blankCount,
    scorePercent,
    now,
  });

  if (!finalized) {
    // Corrida perdida (outra chamada finalizou/expirou primeiro) — nunca grava respostas nem
    // credita pontos para o perdedor (CLAUDE.md §25: "falha transacional não gera pontuação parcial").
    throw new ConflictError("Esta tentativa já foi finalizada.");
  }

  for (const correction of corrections) {
    const questionAttempt = await repos.questionAttempts.upsertForMockExamAttempt({
      userId,
      questionId: correction.questionId,
      mockExamAttemptId: attempt.id,
      selectedOptionId: correction.selectedOptionId,
      isCorrect: correction.isCorrect,
      timeSpentSeconds: timeSpentPerQuestion,
      now,
    });

    if (correction.isCorrect) {
      await eventBus.emit<QuestionCorrectPayload>({
        type: "QuestionCorrect",
        payload: { userId, questionAttemptId: questionAttempt.id, questionId: correction.questionId },
        idempotencyKey: buildIdempotencyKey("QUESTION_CORRECT", userId, questionAttempt.id),
        occurredAt: now,
      });
    }
  }

  await eventBus.emit<MockExamCompletedPayload>({
    type: "MockExamCompleted",
    payload: {
      userId,
      mockExamAttemptId: attempt.id,
      mockExamId: attempt.mockExamId,
      accuracyPercent: scorePercent,
    },
    idempotencyKey: buildIdempotencyKey("MOCK_EXAM_COMPLETED", userId, attempt.id),
    occurredAt: now,
  });

  await auditLog({
    operation: "simulations.submit-and-finalize",
    userId,
    entity: "MockExamAttempt",
    entityId: attempt.id,
    result: "success",
    correlationId: attempt.id,
    metadata: { correctCount, wrongCount, blankCount, scorePercent },
  });

  return buildAttemptResultDTO(finalized);
}

export async function submitAndFinalize(userId: string, input: SubmitAnswersInput): Promise<AttemptResultDTO> {
  const result = await inRepositoryTransaction(async () => {
    try { return await submitAndFinalizeInTransaction(userId, input); }
    catch (error) { if (error instanceof AttemptExpiredError) return error; throw error; }
  });
  if (result instanceof AttemptExpiredError) throw result;
  return result;
}
