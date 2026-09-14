import { createHash, randomBytes, randomUUID } from "node:crypto";
import { isIP } from "node:net";
import bcrypt from "bcryptjs";
import { env } from "@/config/env";
import {
  registerAccountSchema,
  requestAccountEmailSchema,
  requestVerificationSchema,
  verifyAccountSchema,
  resetAccountPasswordSchema,
} from "@/contracts/account";
import { RateLimitError } from "@/server/errors";
import { auditLog } from "@/server/audit/log";
import { PrismaAccountRepository } from "@/server/repositories/prisma/account-repository";
import {
  createResendTransport,
  AccountConfigurationError,
  type AccountEmailTransport,
} from "./email";
import { accountEmailKey, encryptAccountEmail } from "./email-encryption";
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const ACCOUNT_REQUEST_MESSAGE =
  "Solicitação recebida. Se houver uma conta elegível, confira seu e-mail. Caso não receba, tente novamente mais tarde.";
export function trustedAccountIp(headers: Headers, trustedHeader?: string): string | null {
  if (!trustedHeader) return null;
  const value = headers.get(trustedHeader)?.trim();
  return value && isIP(value) ? value : null;
}
export function createAccountService(
  options: {
    transport?: AccountEmailTransport;
    encryptionKey?: string;
    appUrl?: string;
    now?: () => Date;
  } = {},
) {
  const repo = new PrismaAccountRepository();
  const now = options.now ?? (() => new Date());
  const configured = () => {
    if (env.DATA_SOURCE !== "prisma")
      throw new AccountConfigurationError(
        "Este serviço de contas está indisponível neste ambiente.",
      );
  };
  async function limit(action: string, emailOrToken: string, ip: string | null) {
    configured();
    const windowMs = 15 * 60_000;
    // Anonymous deployment-wide budget remains effective when no trusted proxy IP is configured.
    if (!(await repo.reserve("accounts:global", 1000, windowMs))) throw new RateLimitError();
    if (ip && isIP(ip) && !(await repo.reserve("accounts:ip:" + digest(ip), 30, windowMs)))
      throw new RateLimitError();
    if (!(await repo.reserve("accounts:" + action + ":" + digest(emailOrToken), 5, windowMs)))
      throw new RateLimitError();
  }
  async function request(
    raw: unknown,
    purpose: "VERIFY_EMAIL" | "RESET_PASSWORD",
    ip: string | null,
    registration = false,
  ) {
    const registrationInput = registration ? registerAccountSchema.parse(raw) : null;
    const verificationInput =
      !registration && purpose === "VERIFY_EMAIL" ? requestVerificationSchema.parse(raw) : null;
    const input = registrationInput ?? verificationInput ?? requestAccountEmailSchema.parse(raw);
    configured();
    // Validate configuration, but never invoke the transport in a public request.
    if (!options.transport) createResendTransport();
    const encryptionKey = accountEmailKey(
      options.encryptionKey ?? env.ACCOUNT_EMAIL_ENCRYPTION_KEY,
    );
    const origin = new URL(options.appUrl ?? env.APP_URL);
    if (!["http:", "https:"].includes(origin.protocol) || origin.username || origin.password)
      throw new AccountConfigurationError("URL da aplicação inválida.");
    await limit(registration ? "register" : purpose, input.email, ip);
    const timestamp = now();
    const token = randomBytes(32).toString("base64url");
    const hash = digest(token);
    const desiredPassword = registrationInput?.password ?? verificationInput?.password;
    const passwordHash = desiredPassword ? await bcrypt.hash(desiredPassword, 12) : undefined;
    const expiresAt = new Date(
      timestamp.getTime() + (purpose === "VERIFY_EMAIL" ? 24 * 60 * 60_000 : 30 * 60_000),
    );
    // Queue lifetime stays below the provider's 24-hour idempotency retention.
    const queueExpiresAt = new Date(
      Math.min(expiresAt.getTime(), timestamp.getTime() + 23 * 60 * 60_000),
    );
    const queueId = randomUUID(),
      url = new URL(purpose === "VERIFY_EMAIL" ? "/verificar-email" : "/redefinir-senha", origin);
    url.hash = "token=" + token;
    const ciphertext = encryptAccountEmail(
      {
        to: input.email,
        subject:
          purpose === "VERIFY_EMAIL"
            ? "Confirme seu e-mail — Operação Aprovação"
            : "Redefina sua senha — Operação Aprovação",
        text:
          (purpose === "VERIFY_EMAIL"
            ? "Confirme seu cadastro apenas se você o solicitou. O link vale por 24 horas."
            : "Use o link para redefinir sua senha. Ele vale por 30 minutos.") +
          "\n\n" +
          url.toString() +
          "\n\nSe você não solicitou esta ação, ignore esta mensagem.",
        idempotencyKey: hash,
      },
      encryptionKey,
      queueId,
      queueExpiresAt,
    );
    await repo.prepare({
      email: input.email,
      ...(registrationInput ? { name: registrationInput.name } : {}),
      passwordHash,
      purpose,
      hash,
      now: timestamp,
      expiresAt,
      emailQueue: { id: queueId, ciphertext, expiresAt: queueExpiresAt },
    });
    return { message: ACCOUNT_REQUEST_MESSAGE };
  }
  return {
    register: (raw: unknown, ip: string | null = null) => request(raw, "VERIFY_EMAIL", ip, true),
    requestVerification: (raw: unknown, ip: string | null = null) =>
      request(raw, "VERIFY_EMAIL", ip),
    requestReset: (raw: unknown, ip: string | null = null) => request(raw, "RESET_PASSWORD", ip),
    async verify(raw: unknown, ip: string | null = null) {
      const input = verifyAccountSchema.parse(raw);
      await limit("verify", input.token, ip);
      const userId = await repo.consume({
        hash: digest(input.token),
        purpose: "VERIFY_EMAIL",
        now: now(),
      });
      await auditLog({
        operation: "accounts.email-verified",
        entity: "User",
        userId,
        result: "success",
        correlationId: randomUUID(),
      });
      return { message: "E-mail confirmado. Você já pode entrar." };
    },
    async resetPassword(raw: unknown, ip: string | null = null) {
      const input = resetAccountPasswordSchema.parse(raw);
      await limit("reset", input.token, ip);
      const passwordHash = await bcrypt.hash(input.password, 12);
      const userId = await repo.consume({
        hash: digest(input.token),
        purpose: "RESET_PASSWORD",
        now: now(),
        passwordHash,
      });
      await auditLog({
        operation: "accounts.password-reset",
        entity: "User",
        userId,
        result: "success",
        correlationId: randomUUID(),
      });
      return { message: "Senha atualizada. Entre novamente em sua conta." };
    },
  };
}

export { InvalidAccountTokenError } from "@/server/repositories/prisma/account-repository";
