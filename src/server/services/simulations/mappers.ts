import type {
  AttemptDTO,
  AttemptQuestionDTO,
  AttemptResultDTO,
  QuestionResultDTO,
  SubjectPerformanceDTO,
  TopicPerformanceDTO,
} from "@/contracts/simulations";
import { NotFoundError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import { buildIdempotencyKey } from "@/server/services/gamification";
import type { MockExamAttemptEntity } from "@/server/repositories/contracts/mock-exam-attempt-repository";
import type { QuestionAttemptEntity } from "@/server/repositories/contracts/question-attempt-repository";
import { deterministicShuffle } from "./shuffle";

/** Segundos restantes calculados no servidor a partir do relógio ATUAL — nunca um valor do cliente. */
function computeRemainingSeconds(startedAt: string, timeLimitSeconds: number | null, now: Date): number | null {
  if (timeLimitSeconds === null) return null;
  const elapsedSeconds = Math.floor((now.getTime() - Date.parse(startedAt)) / 1000);
  return Math.max(0, timeLimitSeconds - elapsedSeconds);
}

async function buildAttemptQuestionDTO(attemptId: string, questionId: string): Promise<AttemptQuestionDTO> {
  const repos = getRepositories();
  const question = await repos.questions.findById(questionId);
  if (!question) {
    throw new NotFoundError(`Questão não encontrada: ${questionId}`);
  }

  const [subject, topic, options] = await Promise.all([
    repos.subjects.findById(question.subjectId),
    question.topicId ? repos.topics.findById(question.topicId) : Promise.resolve(null),
    repos.questionOptions.listByQuestionId(questionId),
  ]);

  const shuffledOptions = deterministicShuffle(options, `${attemptId}:${questionId}`);

  return {
    questionId: question.id,
    statement: question.statement,
    subjectName: subject?.name ?? "—",
    topicName: topic?.name ?? null,
    board: question.board,
    difficulty: question.difficulty,
    // NUNCA incluir `isCorrect` aqui — `AttemptQuestionOptionDTO` estruturalmente não o possui.
    options: shuffledOptions.map((option) => ({ id: option.id, label: option.label, text: option.text })),
  };
}

/** Monta o DTO da tentativa (sem gabarito) — usado por `createAttempt`/`getAttemptForTaking`. */
export async function buildAttemptDTO(attempt: MockExamAttemptEntity, now: Date = new Date()): Promise<AttemptDTO> {
  const repos = getRepositories();
  const exam = await repos.mockExams.findById(attempt.mockExamId);
  if (!exam) {
    throw new NotFoundError("Simulado da tentativa não encontrado.");
  }

  const questions = await Promise.all(
    exam.questionIds.map((questionId) => buildAttemptQuestionDTO(attempt.id, questionId)),
  );

  return {
    id: attempt.id,
    mockExamId: attempt.mockExamId,
    mockExamTitle: exam.title,
    status: attempt.status,
    startedAt: attempt.startedAt,
    timeLimitSeconds: attempt.timeLimitSeconds,
    remainingSeconds: computeRemainingSeconds(attempt.startedAt, attempt.timeLimitSeconds, now),
    questions,
  };
}

/**
 * Agrega entradas de resposta (matéria/assunto/acerto) em aproveitamento por matéria/assunto.
 * Exportada para reaproveitamento pela Fase 12 (`@/server/services/study-tracking/tracking-overview`),
 * que agrega o HISTÓRICO COMPLETO de `QuestionAttempt` do usuário (não só uma tentativa) com a
 * mesma fórmula — evita duplicar a lógica de acerto/total/percentual em dois lugares.
 */
export function computePerformance(
  entries: Array<{ subjectId: string; subjectName: string; topicId: string | null; topicName: string | null; isCorrect: boolean | null }>,
): { bySubject: SubjectPerformanceDTO[]; byTopic: TopicPerformanceDTO[] } {
  const bySubjectMap = new Map<string, SubjectPerformanceDTO>();
  const byTopicMap = new Map<string, TopicPerformanceDTO>();

  for (const entry of entries) {
    if (entry.isCorrect === null) continue; // não respondidas não contam para aproveitamento por matéria/assunto

    const subjectEntry = bySubjectMap.get(entry.subjectId) ?? {
      subjectId: entry.subjectId,
      subjectName: entry.subjectName,
      total: 0,
      correct: 0,
      accuracyPercent: 0,
    };
    subjectEntry.total += 1;
    if (entry.isCorrect) subjectEntry.correct += 1;
    bySubjectMap.set(entry.subjectId, subjectEntry);

    if (entry.topicId && entry.topicName) {
      const topicEntry = byTopicMap.get(entry.topicId) ?? {
        topicId: entry.topicId,
        topicName: entry.topicName,
        subjectId: entry.subjectId,
        total: 0,
        correct: 0,
        accuracyPercent: 0,
      };
      topicEntry.total += 1;
      if (entry.isCorrect) topicEntry.correct += 1;
      byTopicMap.set(entry.topicId, topicEntry);
    }
  }

  const round2 = (value: number) => Math.round(value * 100) / 100;
  const bySubject = [...bySubjectMap.values()].map((entry) => ({
    ...entry,
    accuracyPercent: entry.total > 0 ? round2((entry.correct / entry.total) * 100) : 0,
  }));
  const byTopic = [...byTopicMap.values()].map((entry) => ({
    ...entry,
    accuracyPercent: entry.total > 0 ? round2((entry.correct / entry.total) * 100) : 0,
  }));

  return { bySubject, byTopic };
}

function buildSuggestions(bySubject: SubjectPerformanceDTO[]): string[] {
  const weakSubjects = bySubject.filter((entry) => entry.accuracyPercent < 60).sort((a, b) => a.accuracyPercent - b.accuracyPercent);

  if (weakSubjects.length === 0) {
    return ["Bom desempenho geral — continue revisando os pontos fracos identificados no caderno de erros."];
  }

  return weakSubjects.map(
    (entry) => `Revisar ${entry.subjectName} (aproveitamento de ${entry.accuracyPercent}% nesta tentativa).`,
  );
}

/** Soma pontos/XP já creditados no ledger para uma chave de idempotência (0 se ainda não creditado). */
async function pointsForIdempotencyKey(key: string): Promise<{ points: number; xp: number }> {
  const repos = getRepositories();
  const transaction = await repos.pointTransactions.findByIdempotencyKey(key);
  return { points: transaction?.points ?? 0, xp: transaction?.xp ?? 0 };
}

/**
 * Monta o resultado PÓS-correção (gabarito liberado). Lê os pontos/XP realmente creditados do
 * ledger (`PointTransaction`) em vez de recalcular a partir de `GAMIFICATION_REWARDS` — correto
 * tanto logo após `submitAndFinalize` quanto em uma leitura posterior via `getResult`.
 */
export async function buildAttemptResultDTO(attempt: MockExamAttemptEntity): Promise<AttemptResultDTO> {
  const repos = getRepositories();
  const exam = await repos.mockExams.findById(attempt.mockExamId);
  if (!exam) {
    throw new NotFoundError("Simulado da tentativa não encontrado.");
  }
  if (attempt.status !== "FINISHED" || attempt.finishedAt === null) {
    throw new NotFoundError("Esta tentativa ainda não foi corrigida.");
  }

  const questionAttempts = await repos.questionAttempts.listByMockExamAttemptId(attempt.id);
  const byQuestionId = new Map<string, QuestionAttemptEntity>(questionAttempts.map((qa) => [qa.questionId, qa]));

  const performanceEntries: Array<{
    subjectId: string;
    subjectName: string;
    topicId: string | null;
    topicName: string | null;
    isCorrect: boolean | null;
  }> = [];
  const questionResults: QuestionResultDTO[] = [];

  let mockExamPoints = 0;
  let mockExamXp = 0;
  let questionPoints = 0;
  let questionXp = 0;

  const mockExamTx = await pointsForIdempotencyKey(
    buildIdempotencyKey("MOCK_EXAM_COMPLETED", attempt.userId, attempt.id),
  );
  mockExamPoints += mockExamTx.points;
  mockExamXp += mockExamTx.xp;

  for (const questionId of exam.questionIds) {
    const question = await repos.questions.findById(questionId);
    if (!question) continue;

    const [subject, topic, options] = await Promise.all([
      repos.subjects.findById(question.subjectId),
      question.topicId ? repos.topics.findById(question.topicId) : Promise.resolve(null),
      repos.questionOptions.listByQuestionId(questionId),
    ]);

    const questionAttempt = byQuestionId.get(questionId) ?? null;

    performanceEntries.push({
      subjectId: question.subjectId,
      subjectName: subject?.name ?? "—",
      topicId: question.topicId,
      topicName: topic?.name ?? null,
      isCorrect: questionAttempt?.isCorrect ?? null,
    });

    if (questionAttempt?.isCorrect) {
      const tx = await pointsForIdempotencyKey(
        buildIdempotencyKey("QUESTION_CORRECT", attempt.userId, questionAttempt.id),
      );
      questionPoints += tx.points;
      questionXp += tx.xp;
    }

    questionResults.push({
      questionId: question.id,
      statement: question.statement,
      subjectName: subject?.name ?? "—",
      topicName: topic?.name ?? null,
      board: question.board,
      difficulty: question.difficulty,
      options: options.map((option) => ({
        id: option.id,
        label: option.label,
        text: option.text,
        isCorrect: option.isCorrect,
      })),
      selectedOptionId: questionAttempt?.selectedOptionId ?? null,
      isCorrect: questionAttempt?.isCorrect ?? null,
      explanation: question.explanation,
    });
  }

  const { bySubject, byTopic } = computePerformance(performanceEntries);

  const previousAttempts = (await repos.mockExamAttempts.listByUserId(attempt.userId)).filter(
    (candidate) =>
      candidate.id !== attempt.id &&
      candidate.mockExamId === attempt.mockExamId &&
      candidate.status === "FINISHED" &&
      candidate.finishedAt !== null &&
      Date.parse(candidate.finishedAt) < Date.parse(attempt.finishedAt!),
  );
  previousAttempts.sort((a, b) => Date.parse(b.finishedAt!) - Date.parse(a.finishedAt!));
  const previousAttempt = previousAttempts[0] ?? null;
  const previousAttemptScorePercent = previousAttempt?.scorePercent ?? null;
  const evolutionPercent =
    previousAttemptScorePercent !== null && attempt.scorePercent !== null
      ? Math.round((attempt.scorePercent - previousAttemptScorePercent) * 100) / 100
      : null;

  const timeSpentSeconds = Math.max(
    0,
    Math.floor((Date.parse(attempt.finishedAt!) - Date.parse(attempt.startedAt)) / 1000),
  );

  return {
    attemptId: attempt.id,
    mockExamId: attempt.mockExamId,
    mockExamTitle: exam.title,
    status: attempt.status,
    startedAt: attempt.startedAt,
    finishedAt: attempt.finishedAt!,
    timeSpentSeconds,
    totalQuestions: exam.questionIds.length,
    correctCount: attempt.correctCount ?? 0,
    wrongCount: attempt.wrongCount ?? 0,
    blankCount: attempt.blankCount ?? 0,
    scorePercent: attempt.scorePercent ?? 0,
    points: mockExamPoints + questionPoints,
    xp: mockExamXp + questionXp,
    bySubject,
    byTopic,
    previousAttemptScorePercent,
    evolutionPercent,
    suggestions: buildSuggestions(bySubject),
    questions: questionResults,
  };
}

