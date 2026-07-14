/**
 * Entidade de domínio de quadro de Brainstorm (`BrainstormBoard`, docs/DATA-MODEL.md —
 * "Brainstorm"). Fase 13 — agente `backend`. Campos alinhados 1:1 com o schema Prisma (sem
 * divergência de aplicação nesta entidade — ver `BrainstormCardEntity.type` no repositório de
 * cartão para o caso divergente).
 */
export interface BrainstormBoardEntity {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface BrainstormBoardCreateInput {
  userId: string;
  title: string;
  now: Date;
}

/**
 * Abstração de persistência para quadros de Brainstorm (ADR-0002). Sem `update`/`delete` nesta
 * fase — nenhuma action de renomear/arquivar/excluir quadro é exposta ainda (fora do escopo da
 * Fase 13; ver CLAUDE.md §6 — menor conjunto de alterações necessário).
 */
export interface BrainstormBoardRepository {
  findById(id: string): Promise<BrainstormBoardEntity | null>;
  listByUserId(userId: string): Promise<BrainstormBoardEntity[]>;
  create(input: BrainstormBoardCreateInput): Promise<BrainstormBoardEntity>;
}
