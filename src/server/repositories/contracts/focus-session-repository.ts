/**
 * Sessão de Modo Foco / Pomodoro (Fase 15 — agente `study-tracking`, CLAUDE.md §14/§15).
 *
 * Repositório PRÓPRIO, não uma extensão de `StudySessionRepository` (`./study-session-repository.ts`)
 * — mesma decisão e motivo já registrados em `./study-mission-repository.ts`: aquele é
 * explicitamente escopado a `source: "LESSON"` (heartbeat de vídeo, com campos como
 * `coveredIntervals`/`lastPositionSeconds` que não fazem sentido para um timer de foco sem
 * "posição"). MAPEAMENTO FUTURO (Prisma, docs/DATA-MODEL.md): `StudySession(source: POMODORO |
 * FREE)` + uma linha `StudyActivity(type: POMODORO_TICK)` por heartbeat aceito — reconciliação
 * real fica para quando o agente `database`/`study-tracking` implementar
 * `PrismaFocusSessionRepository` (hoje um stub, ver `../prisma/focus-session-repository.ts`).
 *
 * LIMITAÇÃO CONHECIDA DO MOCK (mesmo padrão de `StudySessionEntity`): guarda só o estado
 * AGREGADO da sessão (tempo ativo acumulado, contagens de heartbeat) — não o histórico bruto de
 * cada heartbeat (`StudyActivity` real seria append-only, uma linha por heartbeat aceito).
 */
export type FocusMode = "25_5" | "50_10" | "quick_15" | "intense_90" | "free" | "custom";
export type FocusSessionStatus = "ACTIVE" | "FINISHED" | "DISCARDED";

export interface FocusSessionEntity {
  id: string;
  userId: string;
  mode: FocusMode;
  status: FocusSessionStatus;
  /** Alvo (segundos) desta sessão — `0` no modo `free` (sem alvo fixo, cronômetro progressivo). */
  targetSeconds: number;
  breakSeconds: number;
  subjectId: string | null;
  topicId: string | null;
  objective: string | null;
  /** ISO 8601 — horário do SERVIDOR no início (nunca o relógio do cliente). */
  startedAt: string;
  endedAt: string | null;
  /** ISO 8601 — horário do SERVIDOR no último heartbeat aceito (seed = `startedAt` na criação,
   *  para que o primeiro heartbeat já meça o intervalo real desde o início). */
  lastHeartbeatAt: string;
  /** `clientTimestamp` do último heartbeat aceito — só para detectar duplicidade exata; `null`
   *  antes do primeiro heartbeat. */
  lastClientTimestamp: number | null;
  /** Tempo ATIVO (segundos) acumulado a partir de heartbeats válidos — nunca `endedAt -
   *  startedAt` bruto (CLAUDE.md §14). */
  activeSeconds: number;
  /** Total de heartbeats aceitos (inclui duplicados/ociosos/aba oculta — só para diagnóstico). */
  heartbeatCount: number;
  /** Heartbeats que de fato somaram tempo ativo (não descartados) — sinal de "atividade real"
   *  usado por `finishFocusSession`, independente da duração total acumulada. */
  validHeartbeatCount: number;
  /** Fase 15: sempre `1` (1 sessão = 1 ciclo) — ver nota em `@/contracts/focus#focusSessionDTOSchema`. */
  cyclesPlanned: number;
  /** Só chega a `1` quando o ciclo foi validado como REAL pelo servidor (`scored = true`). */
  cyclesCompleted: number;
  goalAchieved: boolean | null;
  contentStudied: string | null;
  focusLevel: number | null;
  doubtNote: string | null;
  /** `true` só quando `PomodoroCompleted` foi de fato emitido para esta sessão. */
  scored: boolean;
  updatedAt: string;
}

export interface FocusSessionCreateInput {
  userId: string;
  mode: FocusMode;
  targetSeconds: number;
  breakSeconds: number;
  subjectId: string | null;
  topicId: string | null;
  objective: string | null;
  now: Date;
}

/** Abstração de persistência para sessões de Modo Foco (ADR-0002). */
export interface FocusSessionRepository {
  /** Escopado por `userId` — uma sessão de outro usuário nunca é retornada (anti-IDOR "por
   *  construção", mesmo padrão de `StudySessionRepository.findSession`). */
  findById(userId: string, id: string): Promise<FocusSessionEntity | null>;
  /** Sessão `ACTIVE` atual do usuário, se houver — no máximo uma por vez (regra desta fase). */
  findActiveByUserId(userId: string): Promise<FocusSessionEntity | null>;
  create(input: FocusSessionCreateInput): Promise<FocusSessionEntity>;
  /** Grava (atualiza) o estado de uma sessão já existente (criada por `create`). */
  save(entity: FocusSessionEntity): Promise<FocusSessionEntity>;
}
