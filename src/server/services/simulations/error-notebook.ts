import type { ErrorNotebookItemDTO } from "@/contracts/simulations";
import { assertOwnership, requireUser } from "@/server/authorization";
import { getRepositories } from "@/server/repositories";

interface WrongAggregate {
  count: number;
  lastAnsweredAt: string;
}

/**
 * Caderno de erros: uma linha por questão que o aluno já errou ao menos uma vez, com a
 * contagem de erros e a data da última resposta errada (CLAUDE.md §18: "questões erradas vão
 * para o caderno de erros").
 */
export async function getErrorNotebook(userId: string): Promise<ErrorNotebookItemDTO[]> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const repos = getRepositories();
  const attempts = await repos.questionAttempts.listByUserId(userId);

  const wrongByQuestion = new Map<string, WrongAggregate>();
  for (const attempt of attempts) {
    if (attempt.isCorrect !== false) continue;
    const existing = wrongByQuestion.get(attempt.questionId);
    wrongByQuestion.set(attempt.questionId, {
      count: (existing?.count ?? 0) + 1,
      lastAnsweredAt:
        existing && Date.parse(existing.lastAnsweredAt) > Date.parse(attempt.answeredAt)
          ? existing.lastAnsweredAt
          : attempt.answeredAt,
    });
  }

  const favorites = await repos.questionFavorites.listByUserId(userId);
  const favoriteIds = new Set(favorites.map((favorite) => favorite.questionId));

  const items = await Promise.all(
    [...wrongByQuestion.entries()].map(async ([questionId, aggregate]) => {
      const question = await repos.questions.findById(questionId);
      if (!question) return null;

      const [subject, topic] = await Promise.all([
        repos.subjects.findById(question.subjectId),
        question.topicId ? repos.topics.findById(question.topicId) : Promise.resolve(null),
      ]);

      const item: ErrorNotebookItemDTO = {
        questionId,
        statement: question.statement,
        subjectName: subject?.name ?? "—",
        topicName: topic?.name ?? null,
        board: question.board,
        difficulty: question.difficulty,
        explanation: question.explanation,
        wrongCount: aggregate.count,
        lastAnsweredAt: aggregate.lastAnsweredAt,
        isFavorite: favoriteIds.has(questionId),
      };
      return item;
    }),
  );

  return items
    .filter((item): item is ErrorNotebookItemDTO => item !== null)
    .sort((a, b) => b.wrongCount - a.wrongCount);
}
