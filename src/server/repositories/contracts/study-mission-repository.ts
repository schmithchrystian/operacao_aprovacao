/**
 * Entidade de domínio da "missão de estudo" (Fase 11 — agente `study-tracking`, "Montar
 * estudo" → "Iniciar missão de estudo"): o registro de que o aluno começou a executar uma
 * sessão gerada (`GeneratedSessionDTO`, `@/contracts/study-session`).
 *
 * `StudyMissionContentType`/`StudyMissionContentRefKind` espelham `ContentType`/
 * `SessionContentRefKind` de `@/contracts/study-session` (redeclarados aqui, nunca importados
 * — ADR-0003: repositório é uma camada abaixo de contratos/DTO, nunca depende deles; mesmo
 * padrão de `QuestionEntity.difficulty` redeclarando `Difficulty` em vez de importar de
 * `@/contracts/simulations`).
 *
 * MAPEAMENTO FUTURO (Prisma): não é um `StudySessionSource` dedicado no schema — a fonte mais
 * próxima é `StudySession(source: FREE)` + uma linha `StudyActivity(type: NAVIGATION)` por
 * bloco iniciado (docs/DATA-MODEL.md). Mantido como repositório PRÓPRIO em vez de reaproveitar
 * `StudySessionRepository` (`./study-session-repository.ts`) porque aquele é explicitamente
 * escopado a `source: "LESSON"` (heartbeat de vídeo, com campos como `coveredIntervals` que não
 * fazem sentido para uma missão multi-bloco) — reconciliação real fica para quando o agente
 * `database`/`study-tracking` implementar `PrismaStudyMissionRepository`.
 */
export type StudyMissionStatus = "ACTIVE" | "FINISHED" | "DISCARDED";

export type StudyMissionContentType =
  | "videoaula"
  | "pdf"
  | "questoes"
  | "flashcards"
  | "revisao"
  | "simulado"
  | "resumo"
  | "mapa_mental";

export type StudyMissionContentRefKind = "lesson" | "mock_exam" | "question_set" | "generic";

export interface StudyMissionContentRefEntity {
  kind: StudyMissionContentRefKind;
  id: string | null;
  title: string;
  href: string | null;
}

export interface StudyMissionBlockEntity {
  type: StudyMissionContentType;
  label: string;
  title: string;
  minutes: number;
  contentRef: StudyMissionContentRefEntity | null;
}

export interface StudyMissionEntity {
  id: string;
  userId: string;
  status: StudyMissionStatus;
  blocks: StudyMissionBlockEntity[];
  currentBlockIndex: number;
  totalMinutes: number;
  /** ISO 8601 — horário do SERVIDOR em que a missão foi iniciada. */
  startedAt: string;
  updatedAt: string;
}

export interface StudyMissionCreateInput {
  userId: string;
  blocks: StudyMissionBlockEntity[];
  totalMinutes: number;
  now: Date;
}

/** Abstração de persistência para missões de estudo (ADR-0002). */
export interface StudyMissionRepository {
  findById(userId: string, id: string): Promise<StudyMissionEntity | null>;
  listByUserId(userId: string): Promise<StudyMissionEntity[]>;
  advance(userId: string, id: string, expectedBlockIndex: number, now: Date): Promise<StudyMissionEntity | null>;
  create(input: StudyMissionCreateInput): Promise<StudyMissionEntity>;
}
