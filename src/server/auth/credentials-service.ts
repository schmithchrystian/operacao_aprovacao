import bcrypt from "bcryptjs";
import { getRepositories } from "@/server/repositories";
import type { Session } from "@/types";
import { randomUUID } from "node:crypto";
import { consumeLoginAttempt } from "./rate-limit";
import { auditLog } from "@/server/audit/log";

// Hash bcrypt sem vínculo com uma credencial válida, usado quando o e-mail não é encontrado.
const DUMMY_PASSWORD_HASH = "$2b$10$Qc9D9Vp/CzKcgm2jUxlJk.G58txKRJBF/VGDZJqEyYJTvG3zF83Xa";

/**
 * Verifica e-mail/senha pelo repositório de usuários e retorna a sessão correspondente, ou `null`
 * quando as credenciais são inválidas.
 *
 * Fronteira compartilhada com orçamento de tentativas e auditoria — usada tanto
 * pelo `authorize()` do Credentials Provider (`@/server/auth/config`) quanto pelos testes
 * de unidade de autorização/login.
 *
 * Regra dura (CLAUDE.md §11): o `role` retornado vem sempre do repositório de usuários
 * (fonte de verdade no servidor). Esta função nunca recebe nem propaga um `role` vindo
 * do chamador.
 */
export async function verifyCredentials(
  email: string,
  password: string,
  otp = "",
): Promise<(Session & { sessionVersion: number }) | null> {
  const correlationId = randomUUID();
  const log = (result: "success" | "failure", userId?: string, blocked = false) =>
    auditLog({
      operation: blocked ? "auth.login.blocked" : "auth.login",
      entity: "User",
      result,
      userId,
      correlationId,
    });
  if (!(await consumeLoginAttempt(email))) {
    await log("failure", undefined, true);
    return null;
  }
  const normalizedEmail = email.trim().toLowerCase();
  const user = await getRepositories().users.findCredentialsByEmail(normalizedEmail);

  if (!user) {
    // Ainda assim executa um bcrypt.compare (contra um hash "dummy") para manter o
    // custo de CPU/tempo de resposta equivalente ao de um e-mail existente — evita
    // vazar por timing se o e-mail está cadastrado.
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
    await log("failure");
    return null;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    await log("failure");
    return null;
  }

  // Fase 17 (admin — "ativar/desativar usuário"): conta desativada nunca autentica. Mesma
  // resposta de credenciais inválidas (nunca revela ao cliente se a conta existe mas está
  // desativada) — CLAUDE.md §24.
  if (!user.isActive || user.deletedAt || (user.requiresEmailVerification && !user.emailVerified)) {
    await log("failure");
    return null;
  }

  const { env } = await import("@/config/env");
  if (env.DATA_SOURCE === "prisma") {
    const { prisma } = await import("@/server/db/prisma");
    const mfa = await prisma.userMfa.findUnique({
      where: { userId: user.id },
      select: { enabledAt: true },
    });
    if (mfa?.enabledAt) {
      const { consumeMfa } = await import("./mfa/service");
      if (!(await consumeMfa(user.id, otp))) {
        await log("failure");
        return null;
      }
    }
  }
  await log("success", user.id);
  return {
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    sessionVersion: user.sessionVersion ?? 0,
  };
}
