/**
 * Entidade de domínio de concurso-alvo (`Contest`, docs/DATA-MODEL.md — Polícia Militar, GCM,
 * Polícia Penal, Bombeiro Militar, ...). Fase 17 — agente `backend` (admin de conteúdo);
 * primeiro repositório real para este domínio — até aqui só existia como literal solto em
 * `src/mocks/data/dashboard-contest.ts` (TODO explícito lá, ver comentário do arquivo).
 */
export interface ContestEntity {
  id: string;
  slug: string;
  name: string;
  organizingBoard: string | null;
  description: string | null;
  deletedAt: string | null;
}

/** Entrada de criação administrativa (Fase 17 — "Concursos: cadastrar"). */
export interface ContestCreateInput {
  slug: string;
  name: string;
  organizingBoard?: string | null;
  description?: string | null;
  now: Date;
}

export interface ContestUpdateInput {
  id: string;
  name?: string;
  organizingBoard?: string | null;
  description?: string | null;
  now: Date;
}

/**
 * Abstração de persistência para concursos (ADR-0002). Escopo desta fase: "ao menos
 * create/list" (CLAUDE.md/Fase 17) — `update`/`softDelete` incluídos por serem de custo
 * marginal baixo reaproveitando o mesmo store, mas SEM tela/fluxo aprofundado (TODO).
 */
export interface ContestRepository {
  findById(id: string): Promise<ContestEntity | null>;
  findBySlug(slug: string): Promise<ContestEntity | null>;
  /** Só concursos ativos (`deletedAt: null`). */
  list(): Promise<ContestEntity[]>;
  /** Fase 17 (admin) — TODOS os concursos, incluindo soft-deleted. */
  listForAdmin(): Promise<ContestEntity[]>;
  create(input: ContestCreateInput): Promise<ContestEntity>;
  update(input: ContestUpdateInput): Promise<ContestEntity>;
  /** Soft-delete — operação destrutiva; o service exige `confirm: true`. */
  softDelete(id: string, now: Date): Promise<ContestEntity>;
}
