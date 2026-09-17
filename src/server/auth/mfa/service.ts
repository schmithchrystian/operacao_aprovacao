import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { env } from "@/config/env";
import { prisma } from "@/server/db/prisma";
import { requireUser } from "@/server/authorization";
import { ForbiddenError } from "@/server/errors";
import { reserveInterval } from "@/server/concurrency/rate-limit";
import { inRepositoryTransaction } from "@/server/repositories/transaction";
import { auditLog } from "@/server/audit/log";
import {
  decryptSecret,
  encryptSecret,
  matchStep,
  newRecoveryCodes,
  newSecret,
  recoveryHash,
} from "./crypto";

function key(): string {
  if (env.DATA_SOURCE !== "prisma" || !env.MFA_ENCRYPTION_KEY)
    throw new ForbiddenError("Autenticação adicional indisponível.");
  return env.MFA_ENCRYPTION_KEY;
}
export async function consumeMfa(userId: string, code: string): Promise<boolean> {
  const record = await prisma.userMfa.findUnique({ where: { userId } });
  if (!record?.enabledAt) return false;
  const step = matchStep(decryptSecret(record.encryptedSecret, key(), userId), code);
  if (step !== null) {
    const result = await prisma.userMfa.updateMany({
      where: { userId, lastStep: { lt: step }, enabledAt: { not: null } },
      data: { lastStep: step },
    });
    return result.count === 1;
  }
  if (!/^[a-f0-9]{32}$/.test(code)) return false;
  const hash = recoveryHash(code);
  // Atomic removal makes recovery codes single-use across parallel workers.
  const result =
    await prisma.$executeRaw`UPDATE "UserMfa" SET "recoveryHashes"=array_remove("recoveryHashes", ${hash}) WHERE "userId"=${userId} AND "enabledAt" IS NOT NULL AND ${hash}=ANY("recoveryHashes")`;
  return result === 1;
}
export async function beginMfa(password: string) {
  const session = await requireUser();
  const encryptionKey = key();
  if (!(await reserveInterval(`mfa-setup:${session.userId}`, 3000, () => false)))
    throw new ForbiddenError("Aguarde e tente novamente.");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
  if (!(await bcrypt.compare(password, user.passwordHash)))
    throw new ForbiddenError("Não foi possível confirmar sua identidade.");
  const secret = newSecret();
  await inRepositoryTransaction(async () => {
    const existing = await prisma.userMfa.findUnique({ where: { userId: user.id } });
    if (existing?.enabledAt) throw new ForbiddenError("Autenticação adicional já ativada.");
    const data = {
      encryptedSecret: encryptSecret(secret, encryptionKey, user.id),
      expiresAt: new Date(Date.now() + 600000),
      recoveryHashes: [],
      lastStep: -1,
    };
    await prisma.userMfa.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...data },
      update: data,
    });
  });
  return {
    secret,
    uri: `otpauth://totp/${encodeURIComponent(`Operação Aprovação:${user.email}`)}?secret=${secret}&issuer=${encodeURIComponent("Operação Aprovação")}&algorithm=SHA1&digits=6&period=30`,
  };
}
export async function confirmMfa(code: string): Promise<string[]> {
  const session = await requireUser();
  if (!(await reserveInterval(`mfa-confirm:${session.userId}`, 3000, () => false)))
    throw new ForbiddenError("Aguarde e tente novamente.");
  return inRepositoryTransaction(async () => {
    const record = await prisma.userMfa.findUnique({ where: { userId: session.userId } });
    if (!record || record.enabledAt || record.expiresAt <= new Date())
      throw new ForbiddenError("Inicie a configuração novamente.");
    const step = matchStep(decryptSecret(record.encryptedSecret, key(), session.userId), code);
    if (step === null) throw new ForbiddenError("Código inválido.");
    const codes = newRecoveryCodes();
    const updated = await prisma.userMfa.updateMany({
      where: { userId: session.userId, enabledAt: null, encryptedSecret: record.encryptedSecret },
      data: { enabledAt: new Date(), lastStep: step, recoveryHashes: codes.map(recoveryHash) },
    });
    if (updated.count !== 1) throw new ForbiddenError("Inicie a configuração novamente.");
    await prisma.user.update({
      where: { id: session.userId },
      data: { sessionVersion: { increment: 1 } },
    });
    await auditLog({
      operation: "auth.mfa.enabled",
      correlationId: randomUUID(),
      entity: "User",
      userId: session.userId,
      result: "success",
    });
    return codes;
  });
}

/** Reauthentication requires both current password and a fresh factor. */
export async function manageMfa(
  password: string,
  code: string,
  disable: boolean,
): Promise<string[]> {
  const session = await requireUser();
  key();
  if (!(await reserveInterval(`mfa-manage:${session.userId}`, 3000, () => false)))
    throw new ForbiddenError("Aguarde e tente novamente.");
  if (disable && env.ADMIN_MFA_REQUIRED && ["admin", "moderador"].includes(session.role))
    throw new ForbiddenError("Autenticação adicional obrigatória.");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
  if (!(await bcrypt.compare(password, user.passwordHash)))
    throw new ForbiddenError("Credenciais inválidas.");
  return inRepositoryTransaction(async () => {
    if (!(await consumeMfa(session.userId, code)))
      throw new ForbiddenError("Credenciais inválidas.");
    const codes = disable ? [] : newRecoveryCodes();
    if (disable) await prisma.userMfa.delete({ where: { userId: session.userId } });
    else
      await prisma.userMfa.update({
        where: { userId: session.userId },
        data: { recoveryHashes: codes.map(recoveryHash) },
      });
    await prisma.user.update({
      where: { id: session.userId },
      data: { sessionVersion: { increment: 1 } },
    });
    await auditLog({
      operation: disable ? "auth.mfa.disabled" : "auth.mfa.recovery-renewed",
      correlationId: randomUUID(),
      entity: "User",
      userId: session.userId,
      result: "success",
    });
    return codes;
  });
}
