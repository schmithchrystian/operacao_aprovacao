import type { MockExamAttemptEntity } from "@/server/repositories/contracts/mock-exam-attempt-repository";
import type { QuestionAttemptEntity } from "@/server/repositories/contracts/question-attempt-repository";
import type { QuestionFavoriteEntity } from "@/server/repositories/contracts/question-favorite-repository";
import { MOCK_EXAM_IDS } from "./mock-exams";

/**
 * Mocks centralizados e tipados (ADR-0011, CLAUDE.md §23) — histórico de demonstração (Fase 10
 * — agente `simulations`): UMA tentativa já finalizada de `user-1` no simulado de Polícia
 * Militar (12 questões, 9 acertos/2 erros/1 em branco = 75%), para popular histórico/caderno de
 * erros/favoritos sem exigir que o usuário refaça o fluxo completo em ambiente de demonstração.
 *
 * Não semeia `GamificationEvent`/`PointTransaction` correspondentes (diferente de
 * `gamification-ledger-seed.ts`) — `points`/`xp` desta tentativa específica aparecem como 0 em
 * `getResult` (limitação aceitável do seed de demonstração; tentativas criadas via
 * `createAttempt`/`submitAndFinalize` no fluxo real sempre têm o ledger correspondente).
 */
const ATTEMPT_ID = "attempt-seed-user-1-pm-01";

export const mockMockExamAttempts: MockExamAttemptEntity[] = [
  {
    id: ATTEMPT_ID,
    userId: "user-1",
    mockExamId: MOCK_EXAM_IDS.policiaMilitar,
    status: "FINISHED",
    startedAt: "2026-07-01T08:00:00.000Z",
    finishedAt: "2026-07-01T09:02:00.000Z",
    timeLimitSeconds: 90 * 60,
    correctCount: 9,
    wrongCount: 2,
    blankCount: 1,
    scorePercent: 75,
    version: 1,
    createdAt: "2026-07-01T08:00:00.000Z",
    updatedAt: "2026-07-01T09:02:00.000Z",
  },
];

/** `selectedOptionId: null` = questão deixada em branco (`isCorrect: null`, nunca `false`). */
export const mockQuestionAttempts: QuestionAttemptEntity[] = [
  {
    id: "qattempt-seed-01",
    userId: "user-1",
    questionId: "question-portugues-01",
    mockExamAttemptId: ATTEMPT_ID,
    selectedOptionId: "question-portugues-01-opt-B",
    isCorrect: true,
    timeSpentSeconds: 60,
    answeredAt: "2026-07-01T08:05:00.000Z",
  },
  {
    id: "qattempt-seed-02",
    userId: "user-1",
    questionId: "question-portugues-02",
    mockExamAttemptId: ATTEMPT_ID,
    selectedOptionId: "question-portugues-02-opt-B",
    isCorrect: false,
    timeSpentSeconds: 90,
    answeredAt: "2026-07-01T08:07:00.000Z",
  },
  {
    id: "qattempt-seed-03",
    userId: "user-1",
    questionId: "question-raciocinio-01",
    mockExamAttemptId: ATTEMPT_ID,
    selectedOptionId: "question-raciocinio-01-opt-C",
    isCorrect: true,
    timeSpentSeconds: 70,
    answeredAt: "2026-07-01T08:09:00.000Z",
  },
  {
    id: "qattempt-seed-04",
    userId: "user-1",
    questionId: "question-raciocinio-02",
    mockExamAttemptId: ATTEMPT_ID,
    selectedOptionId: "question-raciocinio-02-opt-B",
    isCorrect: true,
    timeSpentSeconds: 50,
    answeredAt: "2026-07-01T08:11:00.000Z",
  },
  {
    id: "qattempt-seed-05",
    userId: "user-1",
    questionId: "question-constitucional-01",
    mockExamAttemptId: ATTEMPT_ID,
    selectedOptionId: "question-constitucional-01-opt-B",
    isCorrect: true,
    timeSpentSeconds: 80,
    answeredAt: "2026-07-01T08:14:00.000Z",
  },
  {
    id: "qattempt-seed-06",
    userId: "user-1",
    questionId: "question-constitucional-02",
    mockExamAttemptId: ATTEMPT_ID,
    selectedOptionId: "question-constitucional-02-opt-A",
    isCorrect: true,
    timeSpentSeconds: 65,
    answeredAt: "2026-07-01T08:16:00.000Z",
  },
  {
    id: "qattempt-seed-07",
    userId: "user-1",
    questionId: "question-constitucional-03",
    mockExamAttemptId: ATTEMPT_ID,
    selectedOptionId: "question-constitucional-03-opt-C",
    isCorrect: true,
    timeSpentSeconds: 55,
    answeredAt: "2026-07-01T08:18:00.000Z",
  },
  {
    id: "qattempt-seed-08",
    userId: "user-1",
    questionId: "question-administrativo-01",
    mockExamAttemptId: ATTEMPT_ID,
    selectedOptionId: "question-administrativo-01-opt-A",
    isCorrect: false,
    timeSpentSeconds: 95,
    answeredAt: "2026-07-01T08:21:00.000Z",
  },
  {
    id: "qattempt-seed-09",
    userId: "user-1",
    questionId: "question-administrativo-02",
    mockExamAttemptId: ATTEMPT_ID,
    selectedOptionId: "question-administrativo-02-opt-A",
    isCorrect: true,
    timeSpentSeconds: 60,
    answeredAt: "2026-07-01T08:23:00.000Z",
  },
  {
    id: "qattempt-seed-10",
    userId: "user-1",
    questionId: "question-direitos-humanos-01",
    mockExamAttemptId: ATTEMPT_ID,
    selectedOptionId: "question-direitos-humanos-01-opt-C",
    isCorrect: true,
    timeSpentSeconds: 60,
    answeredAt: "2026-07-01T08:25:00.000Z",
  },
  {
    id: "qattempt-seed-11",
    userId: "user-1",
    questionId: "question-direitos-humanos-02",
    mockExamAttemptId: ATTEMPT_ID,
    selectedOptionId: "question-direitos-humanos-02-opt-D",
    isCorrect: true,
    timeSpentSeconds: 60,
    answeredAt: "2026-07-01T08:27:00.000Z",
  },
  {
    id: "qattempt-seed-12",
    userId: "user-1",
    questionId: "question-direitos-humanos-03",
    mockExamAttemptId: ATTEMPT_ID,
    selectedOptionId: null,
    isCorrect: null,
    timeSpentSeconds: null,
    answeredAt: "2026-07-01T09:02:00.000Z",
  },
];

export const mockQuestionFavorites: QuestionFavoriteEntity[] = [
  { userId: "user-1", questionId: "question-direitos-humanos-01", createdAt: "2026-07-02T10:00:00.000Z" },
];
