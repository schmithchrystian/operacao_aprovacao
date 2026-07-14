/**
 * Conquista desbloqueada (`UserAchievement`, `prisma/schema.prisma`) — ÚNICA por
 * `(userId, achievementKey)`: impossível receber a mesma conquista duas vezes (CLAUDE.md §25).
 * `achievementKey` corresponde à `key` estável definida em
 * `src/server/services/gamification/achievements.ts` (não ao `id` cuid do Prisma).
 */
export interface UserAchievementEntity {
  userId: string;
  achievementKey: string;
  unlockedAt: string;
}

/** Abstração de persistência de conquistas desbloqueadas (ADR-0002). */
export interface UserAchievementRepository {
  listByUserId(userId: string): Promise<UserAchievementEntity[]>;
  findByUserAndKey(userId: string, achievementKey: string): Promise<UserAchievementEntity | null>;
  /**
   * Desbloqueia a conquista. IDEMPOTENTE: se `(userId, achievementKey)` já existir, devolve o
   * registro existente (com o `unlockedAt` original) sem duplicar nem sobrescrever a data.
   */
  unlock(userId: string, achievementKey: string, now: Date): Promise<UserAchievementEntity>;
}
