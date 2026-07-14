/**
 * Entidade de domínio de professor/instrutor (`Teacher`, docs/DATA-MODEL.md — "entidade de
 * ATRIBUIÇÃO de conteúdo, não um papel de acesso"). Fase 17 — agente `backend` (admin de
 * conteúdo); primeiro repositório real para este domínio. `userId` é nullable: um professor
 * pode existir apenas para crédito no conteúdo, sem login na plataforma.
 */
export interface TeacherEntity {
  id: string;
  userId: string | null;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  deletedAt: string | null;
}

/** Entrada de criação administrativa (Fase 17 — "Professores: cadastrar"). */
export interface TeacherCreateInput {
  userId?: string | null;
  name: string;
  bio?: string | null;
  avatarUrl?: string | null;
  now: Date;
}

export interface TeacherUpdateInput {
  id: string;
  name?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  now: Date;
}

/**
 * Abstração de persistência para professores (ADR-0002). Escopo desta fase: "ao menos
 * create/list" (CLAUDE.md/Fase 17) — `update`/`softDelete` incluídos por serem de custo
 * marginal baixo, mas SEM tela/fluxo aprofundado (TODO).
 */
export interface TeacherRepository {
  findById(id: string): Promise<TeacherEntity | null>;
  /** Só professores ativos (`deletedAt: null`). */
  list(): Promise<TeacherEntity[]>;
  /** Fase 17 (admin) — TODOS os professores, incluindo soft-deleted. */
  listForAdmin(): Promise<TeacherEntity[]>;
  create(input: TeacherCreateInput): Promise<TeacherEntity>;
  update(input: TeacherUpdateInput): Promise<TeacherEntity>;
  /** Soft-delete — operação destrutiva; o service exige `confirm: true`. */
  softDelete(id: string, now: Date): Promise<TeacherEntity>;
}
