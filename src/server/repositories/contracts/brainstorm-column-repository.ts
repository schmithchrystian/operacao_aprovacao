/**
 * Entidade de domínio de coluna de Brainstorm (`BrainstormColumn`, docs/DATA-MODEL.md).
 * Fase 13 — agente `backend`.
 *
 * `name` mantido igual ao nome da coluna no schema Prisma (`BrainstormColumn.name`) — o DTO
 * (`BrainstormColumnDTO.title`, `@/contracts/brainstorm`) renomeia para consistência com
 * `title` de board/card (mesmo padrão de `StudyPlanEntity.endDate` → `StudyPlanDTO.examDate`,
 * `@/server/repositories/contracts/study-plan-repository`).
 */
export interface BrainstormColumnEntity {
  id: string;
  boardId: string;
  name: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface BrainstormColumnCreateInput {
  boardId: string;
  name: string;
  order: number;
  now: Date;
}

/**
 * Abstração de persistência para colunas de Brainstorm (ADR-0002). Sem rename/delete/reorder de
 * COLUNA nesta fase — só criação em lote, usada por `createBoard` para as 5 colunas padrão
 * (`BRAINSTORM_DEFAULT_COLUMNS`, `@/config/business`). Reordenar CARTÕES dentro/entre colunas é
 * `BrainstormCardRepository.reorderColumn`/`moveToColumn`.
 */
export interface BrainstormColumnRepository {
  findById(id: string): Promise<BrainstormColumnEntity | null>;
  /** Ordenadas por `order` crescente. */
  listByBoardId(boardId: string): Promise<BrainstormColumnEntity[]>;
  createMany(inputs: BrainstormColumnCreateInput[]): Promise<BrainstormColumnEntity[]>;
}
