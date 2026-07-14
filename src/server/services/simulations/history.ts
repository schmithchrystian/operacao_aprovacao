import type { HistoryItemDTO } from "@/contracts/simulations";
import { assertOwnership, requireUser } from "@/server/authorization";
import { getRepositories } from "@/server/repositories";

/** Histórico de tentativas (qualquer status) do usuário autenticado, mais recente primeiro. */
export async function getHistory(userId: string): Promise<HistoryItemDTO[]> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const repos = getRepositories();
  const attempts = await repos.mockExamAttempts.listByUserId(userId);
  const sorted = [...attempts].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));

  return Promise.all(
    sorted.map(async (attempt) => {
      const exam = await repos.mockExams.findById(attempt.mockExamId);
      return {
        attemptId: attempt.id,
        mockExamId: attempt.mockExamId,
        mockExamTitle: exam?.title ?? null,
        status: attempt.status,
        startedAt: attempt.startedAt,
        finishedAt: attempt.finishedAt,
        totalQuestions: exam?.questionIds.length ?? 0,
        correctCount: attempt.correctCount,
        scorePercent: attempt.scorePercent,
      };
    }),
  );
}
