import type { FavoriteQuestionDTO, FavoriteResultDTO } from "@/contracts/simulations";
import { assertOwnership, requireUser } from "@/server/authorization";
import { NotFoundError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";

/** Alterna o favorito de uma questão para o usuário autenticado. Idempotente por natureza (toggle). */
export async function toggleFavorite(userId: string, questionId: string): Promise<FavoriteResultDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const repos = getRepositories();
  const question = await repos.questions.findById(questionId);
  if (!question) {
    throw new NotFoundError("Questão não encontrada.");
  }

  const isFavorite = await repos.questionFavorites.toggle(userId, questionId);
  return { questionId, isFavorite };
}

/** Lista as questões favoritadas pelo usuário autenticado. */
export async function listFavorites(userId: string): Promise<FavoriteQuestionDTO[]> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const repos = getRepositories();
  const favorites = await repos.questionFavorites.listByUserId(userId);

  const items = await Promise.all(
    favorites.map(async (favorite) => {
      const question = await repos.questions.findById(favorite.questionId);
      if (!question) return null;
      const [subject, topic] = await Promise.all([
        repos.subjects.findById(question.subjectId),
        question.topicId ? repos.topics.findById(question.topicId) : Promise.resolve(null),
      ]);
      const item: FavoriteQuestionDTO = {
        questionId: question.id,
        statement: question.statement,
        subjectName: subject?.name ?? "—",
        topicName: topic?.name ?? null,
        board: question.board,
        difficulty: question.difficulty,
      };
      return item;
    }),
  );

  return items.filter((item): item is FavoriteQuestionDTO => item !== null);
}
