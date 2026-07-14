import { z } from "zod";
import { idSchema } from "./common";

/**
 * Contratos de gestão de usuários (Fase 17 — agente `backend`). "Turmas" (grupos de alunos)
 * NÃO possuem entidade própria no schema atual (`prisma/schema.prisma` — matrícula é direto
 * `User`↔`Course` via `Enrollment`, sem uma tabela "Turma" intermediária) — TODO explícito,
 * fora do escopo desta entrega (CLAUDE.md/Fase 17: "se o schema suportar; senão TODO").
 */

/** Espelha `Role` (`@/types`) em Zod — usado só para validar o papel de DESTINO de
 *  `changeUserRoleInputSchema` (nunca aceito como o papel do CHAMADOR, que vem da sessão). */
export const roleInputSchema = z.enum(["aluno", "professor", "moderador", "admin"]);
export type RoleInput = z.infer<typeof roleInputSchema>;

export const adminUserDTOSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  email: z.string().min(1),
  role: roleInputSchema,
  isActive: z.boolean(),
  createdAt: z.string().min(1),
});
export type AdminUserDTO = z.infer<typeof adminUserDTOSchema>;

/**
 * Entrada de `changeUserRoleAction` — operação SENSÍVEL, só `admin` (CLAUDE.md §11/§24; ver
 * matriz admin×moderador no relatório da Fase 17). Nunca inferir o papel de destino de um botão
 * escondido — sempre explícito no payload e validado aqui.
 */
export const changeUserRoleInputSchema = z.object({
  userId: idSchema,
  role: roleInputSchema,
});
export type ChangeUserRoleInput = z.infer<typeof changeUserRoleInputSchema>;

/** Ativar/desativar conta — reversível (não é soft-delete), por isso sem `confirm`
 *  obrigatório; ainda assim auditado (`withAdminAudit`). */
export const setUserActiveInputSchema = z.object({
  userId: idSchema,
  isActive: z.boolean(),
});
export type SetUserActiveInput = z.infer<typeof setUserActiveInputSchema>;
