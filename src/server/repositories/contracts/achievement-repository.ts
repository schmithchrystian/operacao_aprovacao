/**
 * Entidade de domínio de conquista (`Achievement`, docs/DATA-MODEL.md). Fase 17 — agente
 * `backend` (admin de conteúdo); primeiro repositório real para este domínio.
 *
 * PENDÊNCIA IMPORTANTE (documentar sempre que este arquivo for tocado): o MOTOR de
 * desbloqueio de conquistas (Fase 8 — agente `gamification`,
 * `@/server/services/gamification/achievements.ts`) usa uma lista PRÓPRIA hardcoded
 * (`ACHIEVEMENTS`, com função `isUnlocked` pura em TypeScript) — DESACOPLADA deste
 * repositório. O CRUD administrativo aqui gerencia os METADADOS exibidos (nome, descrição,
 * ícone, pontos, critério em texto/JSON livre) para telas de administração/vitrine, mas
 * EDITAR/CRIAR uma `AchievementEntity` aqui NÃO altera o critério de desbloqueio real nem cria
 * uma conquista desbloqueável de fato — isso exigiria o `gamification` reescrever
 * `evaluateAchievements` para ler critérios de dados em vez de código (CLAUDE.md: "Não defina
 * pontuação [nem critério de conquista] sem participação do agente gamification" — fora do
 * escopo da Fase 17/`backend`). `criteria` é `unknown` (JSON livre) de propósito: é só um
 * registro descritivo até essa integração existir.
 */
export interface AchievementEntity {
  id: string;
  /** Chave estável — corresponde a `Achievement.key` no Prisma e a
   *  `UserAchievement.achievementKey` (`./user-achievement-repository.ts`). */
  key: string;
  name: string;
  description: string | null;
  /** Nome de ícone `lucide-react` — o `frontend` resolve para o componente. */
  icon: string | null;
  /** Critério de desbloqueio em JSON livre — ver pendência acima (não é lido pelo motor real). */
  criteria: unknown;
  points: number;
  deletedAt: string | null;
}

/** Entrada de criação administrativa (Fase 17 — "Conquistas: criar"). */
export interface AchievementCreateInput {
  key: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  criteria?: unknown;
  points?: number;
  now: Date;
}

export interface AchievementUpdateInput {
  id: string;
  name?: string;
  description?: string | null;
  icon?: string | null;
  criteria?: unknown;
  points?: number;
  now: Date;
}

/** Abstração de persistência para conquistas (ADR-0002). */
export interface AchievementRepository {
  findById(id: string): Promise<AchievementEntity | null>;
  findByKey(key: string): Promise<AchievementEntity | null>;
  /** Só conquistas ativas (`deletedAt: null`). */
  list(): Promise<AchievementEntity[]>;
  /** Fase 17 (admin) — TODAS as conquistas, incluindo soft-deleted. */
  listForAdmin(): Promise<AchievementEntity[]>;
  create(input: AchievementCreateInput): Promise<AchievementEntity>;
  update(input: AchievementUpdateInput): Promise<AchievementEntity>;
  /** Soft-delete — operação destrutiva; o service exige `confirm: true`. */
  softDelete(id: string, now: Date): Promise<AchievementEntity>;
}
