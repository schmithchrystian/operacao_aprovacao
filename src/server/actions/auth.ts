"use server";

import { signIn, signOut } from "@/server/auth";
import { loginSchema } from "@/contracts/auth";
import { fail, ok, type ActionResult } from "@/contracts/common";
import { parseInput } from "@/server/validation";
import { isDomainError, ValidationError } from "@/server/errors";

/**
 * Autentica um usuário via Credentials Provider (Auth.js/NextAuth v5).
 *
 * `rawInput` é tratado como `unknown` e sempre revalidado por `loginSchema` no servidor —
 * mesmo que o formulário já valide no cliente (React Hook Form + Zod), nunca confiar
 * apenas nessa validação (CLAUDE.md §9/§11). Como `loginSchema` só declara `email`/`password`,
 * qualquer campo extra enviado pelo cliente (ex.: `role`) é descartado pelo Zod antes de
 * chegar aqui: o papel do usuário autenticado nunca vem do cliente, só do repositório,
 * dentro de `verifyCredentials` (`@/server/auth/credentials-service`).
 *
 * Nunca revela se o e-mail existe: qualquer falha de autenticação retorna a mesma
 * mensagem genérica.
 */
export async function loginAction(
  rawInput: unknown,
): Promise<ActionResult<{ redirectTo: string }>> {
  let input;
  try {
    input = parseInput(loginSchema, rawInput);
  } catch (error) {
    if (isDomainError(error)) {
      const fieldErrors = error instanceof ValidationError ? error.fieldErrors : undefined;
      return fail(error.code, error.message, fieldErrors);
    }
    return fail("INTERNAL_ERROR", "Não foi possível processar sua solicitação.");
  }

  try {
    // The provider owns verification, limiting and audit for both form and HTTP callback.
    await signIn("credentials", { ...input, redirect: false });
  } catch (error) {
    if (error instanceof Error && "type" in error && error.type === "CredentialsSignin") {
      return fail(
        "INVALID_CREDENTIALS",
        "E-mail ou senha inválidos ou limite de tentativas atingido.",
      );
    }
    return fail("INTERNAL_ERROR", "Não foi possível autenticar. Tente novamente.");
  }

  return ok({ redirectTo: "/dashboard" });
}

/** Encerra a sessão atual (cookie JWT) e redireciona para `/login`. */
export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
