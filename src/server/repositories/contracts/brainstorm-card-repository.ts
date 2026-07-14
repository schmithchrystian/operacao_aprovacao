/**
 * Entidade de domínio de cartão de Brainstorm (`BrainstormCard`, docs/DATA-MODEL.md).
 * Fase 13 — agente `backend`.
 */

/** Espelha `BrainstormCardPriority` do Prisma. */
export type BrainstormCardPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

/**
 * Espelha `BrainstormCardStatus` do Prisma — ciclo de vida do cartão, INDEPENDENTE da coluna
 * atual (docs/DATA-MODEL.md, "Brainstorm": "a coluna representa só a posição no quadro").
 * `CONVERTED` é setado por `convertToFlashcard`/`convertToStudyTask`; mover o cartão de coluna
 * (inclusive para "Resolvido", via `markResolved`) nunca altera `status` sozinho.
 */
export type BrainstormCardStatus = "OPEN" | "ARCHIVED" | "CONVERTED";

/**
 * Tipo do cartão (Ideia/Dúvida/Resumo/Anotação — CLAUDE.md §20/Fase 13). CAMPO DE APLICAÇÃO —
 * o modelo `BrainstormCard` no schema Prisma atual (docs/DATA-MODEL.md) ainda NÃO tem uma
 * coluna própria para isto; mesma divergência documentada já existente em
 * `StudyPlanItemEntity.kind` (`@/server/repositories/contracts/study-plan-item-repository`) —
 * pendência para o agente `database` avaliar numa migration futura.
 */
export type BrainstormCardType = "IDEIA" | "DUVIDA" | "RESUMO" | "ANOTACAO";

export interface BrainstormCardEntity {
  id: string;
  columnId: string;
  type: BrainstormCardType;
  title: string;
  content: string | null;
  tags: string[];
  subjectId: string | null;
  topicId: string | null;
  priority: BrainstormCardPriority;
  status: BrainstormCardStatus;
  /** Posição para drag-and-drop — única dentro da coluna (`reorderColumn`). */
  order: number;
  /** Preenchido por `convertToFlashcard` — id do rascunho de flashcard gerado (TODO Fase 14,
   *  ver `@/server/services/brainstorm/flashcard-draft-store.ts`). `null` enquanto não convertido. */
  convertedFlashcardId: string | null;
  /** Preenchido por `convertToStudyTask` — id do `StudyPlanItem` real criado a partir do
   *  cartão (reaproveita os repositórios de Plano de Estudos da Fase 11). `null` enquanto não
   *  convertido. */
  convertedStudyPlanItemId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BrainstormCardCreateInput {
  columnId: string;
  type: BrainstormCardType;
  title: string;
  content: string | null;
  tags: string[];
  subjectId: string | null;
  topicId: string | null;
  priority: BrainstormCardPriority;
  order: number;
  now: Date;
}

export interface BrainstormCardUpdateInput {
  id: string;
  type?: BrainstormCardType;
  title?: string;
  content?: string | null;
  tags?: string[];
  subjectId?: string | null;
  topicId?: string | null;
  priority?: BrainstormCardPriority;
  status?: BrainstormCardStatus;
  convertedFlashcardId?: string | null;
  convertedStudyPlanItemId?: string | null;
  now: Date;
}

/** Abstração de persistência para cartões de Brainstorm (ADR-0002). */
export interface BrainstormCardRepository {
  findById(id: string): Promise<BrainstormCardEntity | null>;
  /** Todos os cartões das colunas informadas, ordenados por `order` crescente (dentro de cada
   *  coluna) — usado por `getBoard`/`listBoards` para montar o quadro inteiro numa só chamada. */
  listByColumnIds(columnIds: string[]): Promise<BrainstormCardEntity[]>;
  create(input: BrainstormCardCreateInput): Promise<BrainstormCardEntity>;
  /** Edição de conteúdo (título/conteúdo/tags/tipo/matéria/assunto/prioridade) e/ou transição
   *  de `status`/campos de conversão. NÃO altera `columnId`/`order` — isso é
   *  `moveToColumn`/`reorderColumn`, mantendo a responsabilidade de reindexação isolada. */
  update(input: BrainstormCardUpdateInput): Promise<BrainstormCardEntity>;
  /**
   * Persiste a ordem final (índice = posição) de TODOS os cartões de UMA coluna — mesma
   * convenção de `StudyPlanItemRepository.reorder`
   * (`@/server/repositories/contracts/study-plan-item-repository`), aqui restrita à coluna
   * informada. Cartões cujo id não aparece em `orderedCardIds` (ex.: pertencem a outra coluna)
   * não são afetados. IDEMPOTENTE: repetir a mesma ordem final não altera nada além de
   * `updatedAt`.
   */
  reorderColumn(columnId: string, orderedCardIds: string[], now: Date): Promise<BrainstormCardEntity[]>;
  /**
   * Atualiza SÓ o `columnId` (FK) do cartão. A ordem correta em origem/destino é
   * responsabilidade de `reorderColumn`, chamado pelo serviço logo em seguida
   * (`@/server/services/brainstorm/move-card.ts#applyMove`) — o serviço orquestra as duas
   * chamadas como uma unidade lógica; numa implementação Prisma real, isso deve virar uma única
   * `$transaction` (pendência registrada para a fase de banco). IDEMPOTENTE: chamar de novo com
   * o mesmo `toColumnId` não altera nada.
   */
  moveToColumn(cardId: string, toColumnId: string, now: Date): Promise<BrainstormCardEntity>;
  delete(id: string): Promise<void>;
}
