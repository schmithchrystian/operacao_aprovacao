import { z } from "zod";
import { idSchema } from "./common";

/**
 * Contratos de avisos/moderação (Fase 17 — agente `backend`). Versão MÍNIMA (CLAUDE.md/Fase 17):
 * broadcast simples (uma `Notification` por destinatário) e moderação de visibilidade
 * (Curso/Questão) via troca de `status` — reaproveita o filtro `PUBLISHED` já aplicado pelos
 * repositórios de leitura (`@/server/repositories/contracts/{course,question}-repository.ts`),
 * sem introduzir um segundo mecanismo de "oculto".
 *
 * TODO (fora do escopo desta entrega): moderação de outras entidades (Módulo/Aula/Simulado),
 * grupo/lote de broadcast (sem "id de campanha" hoje — `NotificationRepository.createMany` cria
 * linhas independentes), notificações push/e-mail (só in-app via `Notification`).
 */

/** Subconjunto de `NotificationType` (Prisma) fazendo sentido como "aviso administrativo"
 *  amplo — os demais tipos (`ACHIEVEMENT_UNLOCKED`, `LEVEL_UP`, ...) são emitidos pelo motor de
 *  gamificação/tracking, nunca por um broadcast manual. */
export const broadcastNotificationTypeSchema = z.enum(["SYSTEM", "COURSE_ANNOUNCEMENT"]);
export type BroadcastNotificationTypeInput = z.infer<typeof broadcastNotificationTypeSchema>;

/**
 * Entrada de `broadcastNotificationAction` — publica o MESMO aviso para todos os usuários ATIVOS
 * (`isActive: true`) por padrão, ou apenas para os papéis informados em `roles` (ex.: avisar só
 * alunos). Nunca aceita uma lista arbitrária de `userId` vinda do cliente (broadcast é sempre
 * "todos" ou "por papel", não segmentação livre nesta versão mínima).
 */
export const broadcastNotificationInputSchema = z.object({
  type: broadcastNotificationTypeSchema,
  title: z.string().min(1, "Informe o título.").max(160),
  message: z.string().min(1, "Informe a mensagem.").max(2000),
  roles: z.array(z.enum(["aluno", "professor", "moderador", "admin"])).min(1).optional(),
});
export type BroadcastNotificationInput = z.infer<typeof broadcastNotificationInputSchema>;

export const broadcastResultDTOSchema = z.object({
  recipientCount: z.number().int().min(0),
});
export type BroadcastResultDTO = z.infer<typeof broadcastResultDTOSchema>;

/** Entidades moderáveis nesta versão mínima (ver TODO no cabeçalho do arquivo). */
export const moderatableEntitySchema = z.enum(["course", "question"]);
export type ModeratableEntityInput = z.infer<typeof moderatableEntitySchema>;

/**
 * Entrada de `moderateContentAction` — oculta/reexibe um curso ou questão trocando `status`
 * para `ARCHIVED`/`PUBLISHED`. Reversível (não é soft-delete) — sem `confirm` obrigatório, mas
 * auditado (`withAdminAudit`).
 */
export const moderateContentInputSchema = z.object({
  entityType: moderatableEntitySchema,
  id: idSchema,
  /** `true` = oculta (`ARCHIVED`); `false` = reexibe (`PUBLISHED`). */
  hidden: z.boolean(),
});
export type ModerateContentInput = z.infer<typeof moderateContentInputSchema>;
