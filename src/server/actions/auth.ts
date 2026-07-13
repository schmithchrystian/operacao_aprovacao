"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { signIn, signOut } from "@/server/auth";
import { loginSchema } from "@/contracts/auth";
import { fail, ok, type ActionResult } from "@/contracts/common";
import { parseInput } from "@/server/validation";
import { isDomainError, ValidationError } from "@/server/errors";
import { auditLog } from "@/server/audit";
import { verifyCredentials } from "@/server/auth/credentials-service";
import {
  buildRateLimitKey,
  checkLoginRateLimit,
  registerLoginFailure,
  resetLoginAttempts,
} from "@/server/auth/rate-limit";

/** Extrai o IP do cliente dos headers de proxy, quando disponível (best-effort). */
async function getClientIp(): Promise<string | null> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    // `x-forwarded-for` pode conter uma lista "client, proxy1, proxy2"; usar o primeiro.
    return forwarded.split(",")[0]?.trim() || null;
  }
  return headerList.get("x-real-ip");
}

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

  const correlationId = randomUUID();
  const rateLimitKey = buildRateLimitKey(input.email, await getClientIp());

  // Barra cedo se a chave (e-mail [+ IP]) já está bloqueada por excesso de falhas — evita
  // até o custo do bcrypt. Mensagem genérica para não vazar existência do e-mail.
  const preStatus = checkLoginRateLimit(rateLimitKey);
  if (preStatus.blocked) {
    auditLog({
      operation: "auth.login.blocked",
      entity: "User",
      result: "failure",
      correlationId,
    });
    return fail(
      "TOO_MANY_ATTEMPTS",
      "Muitas tentativas de login. Aguarde alguns instantes e tente novamente.",
    );
  }

  // Verifica as credenciais primeiro (mesma lógica usada pelo `authorize()` do Credentials
  // Provider — ver `credentials-service.ts`) para: (1) decidir sucesso/falha com a mesma
  // mensagem genérica em ambos os casos e (2) obter o `userId` para a auditoria sem
  // depender de reler o cookie de sessão dentro da mesma execução (o cookie setado por
  // `signIn` abaixo só fica visível em requisições seguintes).
  const verified = await verifyCredentials(input.email, input.password);
  if (!verified) {
    const status = registerLoginFailure(rateLimitKey);
    auditLog({
      operation: status.blocked ? "auth.login.blocked" : "auth.login",
      entity: "User",
      result: "failure",
      correlationId,
    });
    if (status.blocked) {
      return fail(
        "TOO_MANY_ATTEMPTS",
        "Muitas tentativas de login. Aguarde alguns instantes e tente novamente.",
      );
    }
    // Mensagem genérica: nunca revelar se o e-mail existe ou se foi a senha que errou.
    return fail("INVALID_CREDENTIALS", "E-mail ou senha inválidos.");
  }

  try {
    await signIn("credentials", {
      email: input.email,
      password: input.password,
      redirect: false,
    });
  } catch {
    auditLog({
      operation: "auth.login",
      entity: "User",
      userId: verified.userId,
      result: "failure",
      correlationId,
    });
    return fail("INTERNAL_ERROR", "Não foi possível autenticar. Tente novamente.");
  }

  // Login bem-sucedido: zera o contador de falhas da chave.
  resetLoginAttempts(rateLimitKey);

  auditLog({
    operation: "auth.login",
    entity: "User",
    userId: verified.userId,
    result: "success",
    correlationId,
  });

  return ok({ redirectTo: "/dashboard" });
}

/** Encerra a sessão atual (cookie JWT) e redireciona para `/login`. */
export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
