import { z } from "zod";

/**
 * Contrato de login (docs/ARCHITECTURE.md §5, ADR-0005/0006).
 *
 * Deliberadamente NÃO declara um campo `role`: qualquer `role` enviado pelo cliente é
 * descartado por `parseInput`/Zod antes de chegar à Server Action (CLAUDE.md §11 — "não
 * confiar em... campo `role` enviado pelo navegador"). O papel do usuário autenticado só é
 * determinado no servidor, a partir do repositório (`verifyCredentials`).
 */
export const loginSchema = z.object({
  email: z.string().trim().min(1, "Informe o e-mail.").email("E-mail inválido."),
  otp: z.string().trim().max(32).optional(),
  password: z.string().min(1, "Informe a senha."),
});

export type LoginInput = z.infer<typeof loginSchema>;
