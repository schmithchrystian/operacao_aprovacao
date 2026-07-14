/**
 * Entidade de domínio de plano de estudos (`StudyPlan`, docs/DATA-MODEL.md — "Acompanhamento
 * de estudos"). Fase 11 — agente `study-tracking`.
 *
 * Cada aluno mantém, nesta fase, NO MÁXIMO um plano `ACTIVE` por vez — `generatePlan`
 * (`src/server/services/study-plan/generate-plan.ts`) sempre reaproveita/atualiza esse plano
 * em vez de criar um segundo concorrente (evita ambiguidade de "qual é o plano do aluno").
 */
export type StudyPlanStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";

export interface StudyPlanEntity {
  id: string;
  userId: string;
  title: string;
  /** ISO 8601. */
  startDate: string;
  /** Data da prova. Nome mantido igual ao schema Prisma (`StudyPlan.endDate`) — o DTO
   *  (`StudyPlanDTO.examDate`, `@/contracts/study-plan`) renomeia para clareza na fronteira. */
  endDate: string | null;
  status: StudyPlanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StudyPlanCreateInput {
  userId: string;
  title: string;
  startDate: string;
  endDate: string | null;
  now: Date;
}

export interface StudyPlanUpdateInput {
  id: string;
  title?: string;
  startDate?: string;
  endDate?: string | null;
  status?: StudyPlanStatus;
  now: Date;
}

/** Abstração de persistência para planos de estudo (ADR-0002). */
export interface StudyPlanRepository {
  findById(id: string): Promise<StudyPlanEntity | null>;
  /** Plano `ACTIVE` mais recente do usuário, ou `null` quando não existe nenhum ainda. */
  findActiveByUserId(userId: string): Promise<StudyPlanEntity | null>;
  listByUserId(userId: string): Promise<StudyPlanEntity[]>;
  create(input: StudyPlanCreateInput): Promise<StudyPlanEntity>;
  update(input: StudyPlanUpdateInput): Promise<StudyPlanEntity>;
}
