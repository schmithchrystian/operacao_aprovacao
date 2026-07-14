import type { ContentStatus } from "./shared";

/**
 * Entidade de domínio de aula (Curso → Módulo → Aula, CLAUDE.md §12; docs/DATA-MODEL.md).
 * `order` é único por módulo. `requiresLessonId` modela o pré-requisito simples
 * (`Lesson.requiresLessonId` / auto-relação `LessonPrerequisite` no schema Prisma futuro):
 * quando presente, a aula só libera se a aula referenciada estiver concluída, além da
 * regra sequencial padrão (CLAUDE.md §12 — "regras de liberação").
 *
 * NUNCA inclui percentual assistido/tempo — isso é responsabilidade do agente `study-tracking`
 * sobre `LessonProgress` (ver `lesson-progress-repository.ts`). `videoUrl` (Fase 17 — admin,
 * "vincular vídeo") é o único campo de vídeo aqui: é metadado de CONTEÚDO (onde está o vídeo),
 * não de PROGRESSO (quanto foi assistido).
 */
export interface LessonEntity {
  id: string;
  moduleId: string;
  order: number;
  title: string;
  durationMinutes: number;
  /** Aula pré-requisito (id) ou `null` quando não há pré-requisito explícito. */
  requiresLessonId: string | null;
  /** Fase 17 (admin) — URL do vídeo ("vincular vídeo"). `null` = ainda sem vídeo vinculado. */
  videoUrl: string | null;
  /** Fase 17 (admin) — professor responsável pela aula (`Lesson.teacherId`), ou `null`. */
  teacherId: string | null;
  /** Fase 17 (admin) — status editorial. Trilha do aluno (`listByModuleId`) só devolve
   *  `PUBLISHED`. */
  status: ContentStatus;
  /** Fase 17 (admin) — soft-delete (`Lesson.deletedAt`). ISO 8601, ou `null` quando ativa. */
  deletedAt: string | null;
}

/** Entrada de criação administrativa (Fase 17). Quando `order` é omitido, o repositório
 *  acrescenta a aula ao final do módulo (`max(order) + 1`). */
export interface LessonCreateInput {
  moduleId: string;
  title: string;
  durationMinutes: number;
  requiresLessonId?: string | null;
  videoUrl?: string | null;
  teacherId?: string | null;
  order?: number;
  now: Date;
}

export interface LessonUpdateInput {
  id: string;
  title?: string;
  durationMinutes?: number;
  requiresLessonId?: string | null;
  /** Presente (mesmo `null`) = "vincular vídeo"/desvincular; ausente = não altera. */
  videoUrl?: string | null;
  teacherId?: string | null;
  status?: ContentStatus;
  now: Date;
}

/** Abstração de persistência para aulas (ADR-0002). */
export interface LessonRepository {
  /** Busca "crua" (ignora `status`/`deletedAt`) — uso administrativo e do player (a liberação
   *  sequencial/pré-requisito já é validada pelo service de progresso). */
  findById(id: string): Promise<LessonEntity | null>;
  /** Retorna as aulas PUBLICADAS e ativas do módulo, ordenadas por `order` crescente. */
  listByModuleId(moduleId: string): Promise<LessonEntity[]>;
  /** Fase 17 (admin) — TODAS as aulas do módulo (qualquer `status`, incluindo soft-deleted),
   *  ordenadas por `order` crescente. */
  listByModuleIdForAdmin(moduleId: string): Promise<LessonEntity[]>;
  create(input: LessonCreateInput): Promise<LessonEntity>;
  update(input: LessonUpdateInput): Promise<LessonEntity>;
  /** Soft-delete (`deletedAt`) — operação destrutiva; o service exige `confirm: true`. */
  softDelete(id: string, now: Date): Promise<LessonEntity>;
  /**
   * Persiste a nova ordem das aulas do módulo (drag-and-drop admin) — `orderedLessonIds` é a
   * lista COMPLETA das aulas do módulo, na ordem final desejada. IDEMPOTENTE.
   */
  reorder(moduleId: string, orderedLessonIds: string[], now: Date): Promise<LessonEntity[]>;
}
