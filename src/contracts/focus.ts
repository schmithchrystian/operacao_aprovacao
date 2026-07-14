import { z } from "zod";
import { FOCUS, FOCUS_MODE_DURATIONS } from "@/config/business";
import { idSchema } from "./common";

/**
 * Contratos do Modo Foco / Pomodoro (Fase 15 — agente `study-tracking`, CLAUDE.md §14/§15/§25).
 *
 * FRONTEIRA DE DOMÍNIO CRÍTICA (mesmo princípio de `@/contracts/progress` — CLAUDE.md §13/§14):
 * `FocusHeartbeatInput` carrega só SINAIS BRUTOS (aba visível, interação recente; `clientTimestamp`
 * só para detectar duplicidade exata) — NUNCA um campo "concluído"/"pontos". Quem decide se a
 * sessão acumulou tempo ativo e atividade suficientes para pontuar é sempre o SERVIDOR
 * (`@/server/services/focus`), a partir do próprio relógio e do histórico de heartbeats — o
 * cliente nunca envia "o contador chegou a zero, me dê os pontos" (regra dura desta fase).
 */

export const focusModeSchema = z.enum(["25_5", "50_10", "quick_15", "intense_90", "free", "custom"]);
export type FocusMode = z.infer<typeof focusModeSchema>;

/** Espelha `FocusSessionStatus` (`@/server/repositories/contracts/focus-session-repository`),
 *  mesmo conjunto de `StudySessionStatus`/`StudyMissionStatus` do Prisma. */
export const focusSessionStatusSchema = z.enum(["ACTIVE", "FINISHED", "DISCARDED"]);
export type FocusSessionStatus = z.infer<typeof focusSessionStatusSchema>;

/**
 * Entrada de `startFocusSessionAction`. `customFocusMinutes` é obrigatório quando
 * `mode === "custom"` (validado abaixo por `.superRefine` — Zod não expressa essa dependência
 * condicional numa união discriminada simples porque os demais campos são compartilhados entre
 * todos os modos). `subjectId`/`topicId`/`objective` são só METADADOS descritivos (matéria/
 * assunto/objetivo desta sessão) — não são validados contra o catálogo aqui, mesmo tratamento
 * de `buildSessionInputSchema` (`@/contracts/study-session`); nenhuma regra de pontuação depende
 * deles.
 */
export const pomodoroConfigInputSchema = z
  .object({
    mode: focusModeSchema,
    /** Minutos de foco no modo `custom` — ignorado nos demais modos (duração vem de
     *  `FOCUS_MODE_DURATIONS`/modo `free` sem alvo). */
    customFocusMinutes: z.coerce
      .number()
      .int()
      .min(FOCUS.customMinFocusMinutes, `Informe ao menos ${FOCUS.customMinFocusMinutes} minutos.`)
      .max(FOCUS.customMaxFocusMinutes, `Máximo de ${FOCUS.customMaxFocusMinutes} minutos.`)
      .optional(),
    /** Minutos de pausa no modo `custom` — opcional (default 0, sessão só de foco). */
    customBreakMinutes: z.coerce
      .number()
      .int()
      .min(FOCUS.customMinBreakMinutes)
      .max(FOCUS.customMaxBreakMinutes, `Máximo de ${FOCUS.customMaxBreakMinutes} minutos de pausa.`)
      .optional(),
    subjectId: idSchema.optional(),
    topicId: idSchema.optional(),
    objective: z.string().trim().max(FOCUS.objectiveMaxLength, "Objetivo muito longo.").optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "custom" && data.customFocusMinutes === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe a duração de foco para o modo personalizado.",
        path: ["customFocusMinutes"],
      });
    }
  });
export type PomodoroConfigInput = z.infer<typeof pomodoroConfigInputSchema>;

/**
 * Sessão de Modo Foco exposta à UI. `elapsedSeconds` é SEMPRE o tempo ativo VALIDADO no servidor
 * (`FocusSessionEntity.activeSeconds`) — nunca `endedAt - startedAt` bruto nem qualquer valor
 * vindo do cliente. `cyclesCompleted` só chega a `1` quando o ciclo foi validado como REAL pelo
 * servidor (`finishFocusSession` concedeu os pontos) — nunca reflete apenas "o contador chegou a
 * zero" (CLAUDE.md §15, regra dura da fase).
 *
 * SIMPLIFICAÇÃO DESTA FASE (documentada): 1 sessão = 1 ciclo (`cyclesPlanned` é sempre `1`).
 * Encadear múltiplos ciclos automaticamente (ex.: 4×25/5 antes de uma pausa longa, técnica
 * Pomodoro clássica) exigiria uma ação de "próximo ciclo" que o enunciado desta fase não pede —
 * fica para uma fase futura; hoje, encadear ciclos = o aluno chama `startFocusSession` de novo.
 */
export const focusSessionDTOSchema = z.object({
  id: idSchema,
  mode: focusModeSchema,
  status: focusSessionStatusSchema,
  startedAt: z.string().min(1),
  endedAt: z.string().min(1).nullable(),
  /** Alvo (segundos) desta sessão — `0` no modo `free` (cronômetro livre, sem alvo fixo). */
  targetSeconds: z.number().int().min(0),
  breakSeconds: z.number().int().min(0),
  /** Tempo ATIVO validado no servidor — nunca o tempo decorrido bruto do navegador. */
  elapsedSeconds: z.number().int().min(0),
  subjectId: idSchema.nullable(),
  topicId: idSchema.nullable(),
  objective: z.string().nullable(),
  cyclesPlanned: z.number().int().min(0),
  cyclesCompleted: z.number().int().min(0),
});
export type FocusSessionDTO = z.infer<typeof focusSessionDTOSchema>;

/** Sinais BRUTOS do timer de Modo Foco — mesmo espírito de `heartbeatInputSchema`
 *  (`@/contracts/progress`), sem posição de vídeo (não se aplica a um timer). */
export const focusHeartbeatInputSchema = z.object({
  sessionId: idSchema,
  tabVisible: z.boolean(),
  /** Interação recente detectada pelo cliente (mouse/teclado/toque) — um SINAL bruto, nunca uma
   *  alegação de "tempo válido"; o servidor decide o resto a partir do próprio relógio. */
  interacting: z.boolean(),
  /** Epoch ms do relógio do CLIENTE — usado só para detectar heartbeats duplicados. */
  clientTimestamp: z.number().finite().min(0),
});
export type FocusHeartbeatInput = z.infer<typeof focusHeartbeatInputSchema>;

/** Flags de diagnóstico devolvidas após avaliar um heartbeat (não sensíveis — sem PII). */
export const focusHeartbeatFlagSchema = z.enum(["duplicate", "tab_hidden", "idle", "gap_clamped"]);
export type FocusHeartbeatFlag = z.infer<typeof focusHeartbeatFlagSchema>;

export const focusHeartbeatResultDTOSchema = z.object({
  session: focusSessionDTOSchema,
  flags: z.array(focusHeartbeatFlagSchema),
});
export type FocusHeartbeatResultDTO = z.infer<typeof focusHeartbeatResultDTOSchema>;

/**
 * Entrada de `finishFocusSessionAction` — metadados do formulário de encerramento, TODOS
 * opcionais. Nenhum campo de "concluído"/"pontos" aqui: a decisão de pontuar é 100% do servidor
 * (`finishFocusSession`), a partir do histórico de heartbeats desta sessão — nunca do formulário.
 */
export const finishFocusInputSchema = z.object({
  sessionId: idSchema,
  /** Autoavaliação do aluno sobre o objetivo definido no início — informativo, NUNCA usado para
   *  decidir pontuação. */
  goalAchieved: z.boolean().optional(),
  contentStudied: z.string().trim().max(FOCUS.contentStudiedMaxLength, "Conteúdo muito longo.").optional(),
  /** Autoavaliação de nível de foco (1 a 5) — informativo. */
  focusLevel: z.coerce.number().int().min(1).max(5).optional(),
  /** Dúvida registrada para revisar depois (ex.: candidata a virar card no Brainstorm numa fase
   *  futura) — texto livre, informativo. */
  doubtNote: z.string().trim().max(FOCUS.doubtNoteMaxLength, "Anotação muito longa.").optional(),
});
export type FinishFocusInput = z.infer<typeof finishFocusInputSchema>;

export const finishFocusResultDTOSchema = z.object({
  session: focusSessionDTOSchema,
  /** `true` só quando esta chamada validou atividade real suficiente e creditou os 50 pontos
   *  (`PomodoroCompleted`, idempotente). `false` = sessão registrada normalmente (status
   *  `FINISHED`), mas SEM pontuar — CLAUDE.md §15: "o contador chegar a zero não basta". */
  scored: z.boolean(),
  points: z.number().int().min(0),
  xp: z.number().int().min(0),
  /** Motivo seguro (sem detalhe interno) quando `scored === false`; `null` quando pontuou. */
  reasonNotScored: z.string().nullable(),
});
export type FinishFocusResultDTO = z.infer<typeof finishFocusResultDTOSchema>;

/** Espelha `FOCUS_MODE_DURATIONS` (`@/config/business`) — reexportado para a UI poder exibir os
 *  minutos de cada modo preestabelecido sem duplicar a tabela. */
export const FOCUS_PRESET_MODES = Object.keys(FOCUS_MODE_DURATIONS) as Array<keyof typeof FOCUS_MODE_DURATIONS>;
