/** Entidade de domínio de questão favoritada (`QuestionFavorite`, docs/DATA-MODEL.md). */
export interface QuestionFavoriteEntity {
  userId: string;
  questionId: string;
  /** ISO 8601. */
  createdAt: string;
}

/** Abstração de persistência para questões favoritas (ADR-0002). */
export interface QuestionFavoriteRepository {
  listByUserId(userId: string): Promise<QuestionFavoriteEntity[]>;
  isFavorite(userId: string, questionId: string): Promise<boolean>;
  /** Alterna o favorito (cria se não existir, remove se existir). Retorna o novo estado. */
  toggle(userId: string, questionId: string): Promise<boolean>;
}
