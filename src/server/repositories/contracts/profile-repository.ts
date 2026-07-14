/**
 * Perfil do aluno (`Profile`, `prisma/schema.prisma`, docs/DATA-MODEL.md) — Fase 16 (agente
 * `backend`). 1:1 com `User` (`userId` único) — no máximo uma linha por usuário.
 *
 * PRIVACIDADE (REGRA DURA, CLAUDE.md §11/§24): as 4 primeiras flags abaixo já existem como
 * coluna própria no schema Prisma e são a fonte de verdade consultada pelos serviços
 * (`src/server/services/profile`, `src/server/services/gamification/ranking/read.ts`) — a
 * aplicação acontece SEMPRE no servidor, nunca confiando em esconder campo só na UI.
 *
 * CAMPOS DE APLICAÇÃO (ainda SEM coluna própria no Prisma — pendência explícita para o agente
 * `database` avaliar numa migration futura; mesmo padrão já usado em
 * `FlashcardDeckEntity.kind`/`StudyPlanItemEntity.kind`, ver comentários lá):
 * - `showStudyHours`: mascara horas de estudo/aulas concluídas/simulados concluídos
 *   (métricas de ATIVIDADE) na visão de um visitante que não é o dono.
 * - `showPerformance`: mascara a média de simulados (DESEMPENHO) na mesma visão.
 * Ambas nascem `true` por padrão (mesma postura dos outros 3 defaults `true` do schema — só
 * `isProfilePublic` nasce fechado). Enquanto não existir coluna própria, `MockProfileRepository`
 * guarda os dois campos junto com o resto da entidade; `PrismaProfileRepository` documenta a
 * pendência no próprio stub.
 *
 * "Concursos de interesse"/"concurso principal"/"data da prova" NÃO são campos deste
 * repositório — são DERIVADOS por `src/server/services/profile` a partir de repositórios já
 * existentes (`EnrollmentRepository`+`CourseRepository` / `Profile.targetContestId` /
 * `StudyPlanRepository`), nunca duplicados aqui.
 */
export interface ProfileEntity {
  id: string;
  userId: string;
  bio: string | null;
  avatarUrl: string | null;
  phone: string | null;
  /** ISO 8601, ou `null`. */
  birthDate: string | null;
  city: string | null;
  state: string | null;
  /** FK para `Contest.id` — "concurso principal". `null` = ainda não escolhido. */
  targetContestId: string | null;

  isProfilePublic: boolean;
  showInRanking: boolean;
  showRealName: boolean;
  showCityState: boolean;
  /** CAMPO DE APLICAÇÃO — ver cabeçalho do arquivo. */
  showStudyHours: boolean;
  /** CAMPO DE APLICAÇÃO — ver cabeçalho do arquivo. */
  showPerformance: boolean;

  createdAt: string;
  updatedAt: string;
}

/** Defaults exatos do schema Prisma (docs/DATA-MODEL.md) + os 2 campos de aplicação — usados
 *  ao criar a linha de um usuário que ainda não tem Profile. Fail-closed por construção:
 *  `isProfilePublic: false` já fecha o perfil para terceiros até o dono optar por abri-lo. */
export const DEFAULT_PRIVACY_SETTINGS = {
  isProfilePublic: false,
  showInRanking: true,
  showRealName: true,
  showCityState: true,
  showStudyHours: true,
  showPerformance: true,
} as const;

export interface ProfileCreateInput {
  userId: string;
  /** Relógio injetado pelo chamador — nunca `Date.now()`/`new Date()` direto no repositório. */
  now: Date;
}

/** Entrada de atualização dos campos de PERFIL (não-privacidade). Campos `undefined` (omitidos)
 *  preservam o valor atual; `null` explícito limpa o campo — distinção preservada pelo
 *  serviço/repositório (mesmo padrão de `StudyPlanUpdateInput`/`BrainstormCard` update). */
export interface ProfileUpdateInput {
  userId: string;
  bio?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  city?: string | null;
  state?: string | null;
  targetContestId?: string | null;
  now: Date;
}

/** Entrada de atualização das flags de PRIVACIDADE. Campos omitidos preservam o valor atual. */
export interface ProfilePrivacyUpdateInput {
  userId: string;
  isProfilePublic?: boolean;
  showInRanking?: boolean;
  showRealName?: boolean;
  showCityState?: boolean;
  showStudyHours?: boolean;
  showPerformance?: boolean;
  now: Date;
}

/** Abstração de persistência para perfis (ADR-0002). */
export interface ProfileRepository {
  findByUserId(userId: string): Promise<ProfileEntity | null>;
  /**
   * Busca em lote — usado por `ranking/read.ts` para resolver identidade/privacidade de uma
   * página inteira do ranking sem N chamadas seriais. Implementações reais (Prisma) devem usar
   * `WHERE userId IN (...)`. Ordem de retorno não é garantida; usuários sem Profile
   * simplesmente não aparecem no resultado (o chamador trata como "sem Profile").
   */
  findByUserIds(userIds: readonly string[]): Promise<ProfileEntity[]>;
  /** Cria a linha (assume que ainda não existe — quem chama decide "get or create"; ver
   *  `@/server/services/profile/shared#getOrCreateProfile`). Preenche os 6 campos de
   *  privacidade com `DEFAULT_PRIVACY_SETTINGS` e os demais campos como `null`. */
  create(input: ProfileCreateInput): Promise<ProfileEntity>;
  /** Atualiza campos de perfil de uma linha JÁ existente. Lança se não existir (o serviço
   *  garante a existência via `getOrCreateProfile` antes de chamar). */
  update(input: ProfileUpdateInput): Promise<ProfileEntity>;
  /** Atualiza só as flags de privacidade de uma linha já existente. Mesma garantia acima. */
  updatePrivacy(input: ProfilePrivacyUpdateInput): Promise<ProfileEntity>;
}
