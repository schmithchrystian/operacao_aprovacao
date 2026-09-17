import { z } from "zod";
import { idSchema } from "./common";
import { lessonStatusSchema } from "./courses";
import { dashboardAchievementSchema } from "./dashboard";

/**
 * Contratos de progresso de vídeo / tempo válido (Fase 7 — agente `study-tracking`).
 *
 * FRONTEIRA DE DOMÍNIO (crítico — CLAUDE.md §13/§14, docs/ARCHITECTURE.md §5): `HeartbeatInput`
 * carrega só SINAIS BRUTOS do player. Nunca um "percentual assistido" ou "tempo total" prontos.
 * O servidor (`src/server/services/study-tracking`) reconstrói `watchedPercent` e o tempo válido
 * a partir desses sinais + do relógio do PRÓPRIO servidor (nunca do cliente). `clientTimestamp`
 * só serve para detectar heartbeats duplicados (mesmo timestamp/sessão) — o intervalo real entre
 * eventos é sempre medido pelo horário de recebimento no servidor, nunca pelo timestamp do
 * cliente. `durationSeconds` é só um sinal de plausibilidade; a duração CANÔNICA (denominador
 * de `watchedPercent`) vem do catálogo (`Lesson.durationMinutes`), nunca do navegador.
 */

/** Sanidade — nenhuma aula real chega perto de 6h; evita payloads absurdos antes do serviço. */
const HEARTBEAT_MAX_POSITION_SECONDS = 6 * 60 * 60;

export const heartbeatInputSchema = z.object({
  lessonId: idSchema,
  /** Identificador de sessão de reprodução gerado pelo player (client). Agrupa heartbeats. */
  sessionId: z.string().min(1, "Sessão obrigatória.").max(128),
  positionSeconds: z.number().finite().min(0).max(HEARTBEAT_MAX_POSITION_SECONDS),
  /** Sinal de plausibilidade apenas — nunca usado como denominador de conclusão. */
  durationSeconds: z.number().finite().min(1).max(HEARTBEAT_MAX_POSITION_SECONDS),
  playing: z.boolean(),
  tabVisible: z.boolean(),
  playbackRate: z.number().finite().min(0.05).max(8),
  /** Epoch ms do relógio do CLIENTE — usado só para detectar duplicidade exata. */
  clientTimestamp: z.number().finite().min(0),
});
export type HeartbeatInput = z.infer<typeof heartbeatInputSchema>;

/** Flags de diagnóstico devolvidas após avaliar um heartbeat (não sensíveis — sem PII). */
export const heartbeatFlagSchema = z.enum([
  "duplicate",
  "tab_hidden",
  "not_playing",
  "gap_clamped",
  "position_jump_discarded",
  "rate_clamped",
  "concurrent_session_suspected",
]);
export type HeartbeatFlag = z.infer<typeof heartbeatFlagSchema>;

/**
 * "Vitória conquistada" — conclusão válida de aula. Pontos/XP vêm do motor de gamificação
 * (Fase 8, `src/server/services/gamification/engine.ts`). `achievementUnlocked` é preenchido
 * quando esta conclusão (de aula, módulo ou curso, na mesma chamada) desbloqueia alguma
 * conquista pela primeira vez; `null` quando nenhuma foi desbloqueada. Reaproveita
 * `dashboardAchievementSchema` (mesma forma exibida no dashboard) para não duplicar o
 * contrato. Quando mais de uma conquista é desbloqueada na mesma chamada (raro — ex.: aula
 * cruza o limiar de "10 aulas" e conclui o módulo simultaneamente), só a primeira é
 * reportada aqui; todas ficam persistidas em `UserAchievement` e visíveis via
 * `getUserGamification` (limitação documentada — CLAUDE.md §27).
 */
export const lessonCompletionDTOSchema = z.object({
  lessonId: idSchema,
  lessonTitle: z.string().min(1),
  points: z.number().int().min(0),
  xp: z.number().int().min(0),
  /** Percentual (0–100) de aulas concluídas no módulo/curso após esta conclusão. */
  moduleProgressPercent: z.number().min(0).max(100),
  courseProgressPercent: z.number().min(0).max(100),
  achievementUnlocked: dashboardAchievementSchema.nullable(),
});
export type LessonCompletionDTO = z.infer<typeof lessonCompletionDTOSchema>;

export const heartbeatResultDTOSchema = z.object({
  lessonId: idSchema,
  /** Percentual (0–100) RECOMPUTADO no servidor a partir das posições cobertas — nunca o valor enviado pelo cliente. */
  watchedPercent: z.number().min(0).max(100),
  status: lessonStatusSchema,
  /** Posição (segundos) para retomar a reprodução — última posição válida aceita pelo servidor. */
  resumePositionSeconds: z.number().min(0),
  /** `true` só na chamada que cruzou o limiar de conclusão pela primeira vez (idempotente). */
  justCompleted: z.boolean(),
  completion: lessonCompletionDTOSchema.nullable(),
  flags: z.array(heartbeatFlagSchema),
});
export type HeartbeatResultDTO = z.infer<typeof heartbeatResultDTOSchema>;

export const getLessonViewInputSchema = z.object({
  courseSlug: z.string().min(1, "Informe o curso."),
  moduleSlug: z.string().min(1, "Informe o módulo."),
  lessonId: idSchema,
});
export type GetLessonViewInput = z.infer<typeof getLessonViewInputSchema>;

export const lessonMaterialDTOSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.string().min(1),
});
export type LessonMaterialDTO = z.infer<typeof lessonMaterialDTOSchema>;

export const lessonNeighborDTOSchema = z.object({
  lessonId: idSchema,
  title: z.string().min(1),
  href: z.string().min(1),
});
export type LessonNeighborDTO = z.infer<typeof lessonNeighborDTOSchema>;

/** Dados completos da página de aula (player + materiais + navegação + progresso). */
export const lessonViewDTOSchema = z.object({
  lessonId: idSchema,
  title: z.string().min(1),
  order: z.number().int().min(1),
  durationMinutes: z.number().int().min(0),
  teacherName: z.string().min(1),
  description: z.string(),
  materials: z.array(lessonMaterialDTOSchema),
  /** URL HTTPS cadastrada e validada no servidor; vazio quando não há mídia. */
  videoUrl: z.string(),
  status: lessonStatusSchema,
  locked: z.boolean(),
  /** Posição salva (segundos) para retomar — 0 quando não há progresso anterior. */
  resumePositionSeconds: z.number().min(0),
  watchedPercent: z.number().min(0).max(100),
  moduleProgressPercent: z.number().min(0).max(100),
  courseProgressPercent: z.number().min(0).max(100),
  previousLesson: lessonNeighborDTOSchema.nullable(),
  nextLesson: lessonNeighborDTOSchema.nullable(),
});
export type LessonViewDTO = z.infer<typeof lessonViewDTOSchema>;
