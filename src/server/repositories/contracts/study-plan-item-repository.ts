/**
 * Entidade de domínio de item de plano de estudos (`StudyPlanItem`, docs/DATA-MODEL.md).
 * Fase 11 — agente `study-tracking`. `subjectId`/`topicId`/`lessonId` são mutuamente
 * independentes (todos opcionais, igual ao schema real) — um item pode não estar atrelado a
 * nenhum conteúdo específico (ex.: um simulado geral).
 */
export type StudyPlanItemStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "SKIPPED";

/**
 * Discriminador de tipo do item. CAMPO DE APLICAÇÃO — `StudyPlanItem` no schema Prisma
 * (docs/DATA-MODEL.md) ainda NÃO tem uma coluna própria para isto; a distinção entre um bloco
 * de estudo comum, uma revisão e um simulado é mantida só nesta camada (mock) até que o
 * agente `database` avalie adicionar a coluna real numa migration futura (pendência registrada
 * no relatório da Fase 11 — mesmo tipo de divergência documentada já existente em
 * `ModuleEntity.subjectId`, que também não é uma coluna do `Module` no schema atual).
 */
export type StudyPlanItemKind = "STUDY" | "REVIEW" | "MOCK_EXAM" | "CUSTOM";

export interface StudyPlanItemEntity {
  id: string;
  studyPlanId: string;
  kind: StudyPlanItemKind;
  subjectId: string | null;
  topicId: string | null;
  lessonId: string | null;
  title: string;
  /** ISO 8601, ou `null` quando o item ainda não tem uma data alvo. */
  targetDate: string | null;
  estimatedMinutes: number | null;
  /** Posição para drag-and-drop — única dentro do plano (`reorder`). */
  order: number;
  status: StudyPlanItemStatus;
  /** ISO 8601, ou `null` enquanto não concluído. */
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudyPlanItemCreateInput {
  studyPlanId: string;
  kind: StudyPlanItemKind;
  subjectId: string | null;
  topicId: string | null;
  lessonId: string | null;
  title: string;
  targetDate: string | null;
  estimatedMinutes: number | null;
  order: number;
  now: Date;
}

export interface StudyPlanItemUpdateInput {
  id: string;
  status?: StudyPlanItemStatus;
  targetDate?: string | null;
  estimatedMinutes?: number | null;
  title?: string;
  now: Date;
}

/** Abstração de persistência para itens de plano de estudos (ADR-0002). */
export interface StudyPlanItemRepository {
  findById(id: string): Promise<StudyPlanItemEntity | null>;
  /** Ordenados por `order` crescente. */
  listByPlanId(planId: string): Promise<StudyPlanItemEntity[]>;
  /** Cria em lote, na ordem informada — usado por `generatePlan` para inserir o conjunto novo
   *  de itens de uma só vez após limpar os anteriores (`deleteByPlanId`). */
  createMany(inputs: StudyPlanItemCreateInput[]): Promise<StudyPlanItemEntity[]>;
  update(input: StudyPlanItemUpdateInput): Promise<StudyPlanItemEntity>;
  /**
   * Persiste a nova ordem (drag-and-drop): `orderedItemIds` é a lista COMPLETA de itens do
   * plano na ordem final desejada — o repositório reatribui `order` = índice (0-based).
   * IDEMPOTENTE: chamar de novo com a mesma ordem não altera nada além de `updatedAt`.
   */
  reorder(planId: string, orderedItemIds: string[], now: Date): Promise<StudyPlanItemEntity[]>;
  /** Remove todos os itens do plano — usado por `generatePlan` antes de inserir o conjunto
   *  novo (regeneração substitui o conteúdo do plano ativo em vez de acumular). */
  deleteByPlanId(planId: string): Promise<void>;
}
