import { LOGIN_RATE_LIMIT } from "@/config/business";
import { mockStore } from "@/server/repositories/mock/mock-store";
import { createHash } from "node:crypto";
import { env } from "@/config/env";

/** Account-wide budget cannot be bypassed by rotating untrusted forwarded-IP headers.
 * Successful attempts also consume budget; resetting on success would reopen races.
 */
export async function consumeLoginAttempt(email: string): Promise<boolean> {
  const key = createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  if (env.DATA_SOURCE === "prisma") {
    const { reserveLoginAttempt } =
      await import("@/server/repositories/prisma/security-rate-limit-repository");
    return reserveLoginAttempt(key);
  }
  // No await between check and increment: this mock reservation is atomic in one process.
  if (checkLoginRateLimit(key).blocked) return false;
  registerLoginFailure(key);
  return true;
}

/** Legacy mock helpers below are retained for isolated tests. Runtime callers use
 * consumeLoginAttempt: PostgreSQL in prisma mode; process memory only in mock mode.
 */

interface AttemptRecord {
  failures: number;
  /** Início da janela de contagem atual (ms epoch). */
  windowStart: number;
  /** Enquanto `now < lockedUntil`, a chave está bloqueada (ms epoch). */
  lockedUntil?: number;
}

// Estado via `mockStore` (`@/server/repositories/mock/mock-store`) — compartilhado entre
// instâncias de módulo (Next.js 16/Turbopack), não só entre hot-reloads em dev.
const store = mockStore<Map<string, AttemptRecord>>("auth-login-rate-limit", () => new Map());

export interface RateLimitStatus {
  blocked: boolean;
  /** Milissegundos restantes de bloqueio (apenas quando `blocked`). */
  retryAfterMs?: number;
}

/** Monta a chave de rate limit a partir do e-mail (normalizado) e do IP, quando houver. */
export function buildRateLimitKey(email: string, ip?: string | null): string {
  const normalizedEmail = email.trim().toLowerCase();
  return ip ? `${ip}:${normalizedEmail}` : normalizedEmail;
}

/**
 * Retorna o status atual da chave SEM registrar tentativa. Chamar antes de validar as
 * credenciais para barrar cedo (e evitar até o custo do bcrypt) quando já bloqueada.
 */
export function checkLoginRateLimit(key: string, now: number = Date.now()): RateLimitStatus {
  const record = store.get(key);
  if (!record) {
    return { blocked: false };
  }

  if (record.lockedUntil && now < record.lockedUntil) {
    return { blocked: true, retryAfterMs: record.lockedUntil - now };
  }

  return { blocked: false };
}

/**
 * Registra uma falha de login para a chave e devolve o status resultante. Ao atingir
 * `maxFailures` dentro de `windowMs`, ativa o bloqueio por `lockoutMs`.
 */
export function registerLoginFailure(key: string, now: number = Date.now()): RateLimitStatus {
  const { maxFailures, windowMs, lockoutMs } = LOGIN_RATE_LIMIT;
  const record = store.get(key);

  // Sem registro, ou janela expirada, ou bloqueio anterior já vencido → recomeça a janela.
  if (
    !record ||
    now - record.windowStart > windowMs ||
    (record.lockedUntil !== undefined && now >= record.lockedUntil)
  ) {
    const fresh: AttemptRecord = { failures: 1, windowStart: now };
    if (fresh.failures >= maxFailures) {
      fresh.lockedUntil = now + lockoutMs;
    }
    store.set(key, fresh);
    return fresh.lockedUntil
      ? { blocked: true, retryAfterMs: fresh.lockedUntil - now }
      : { blocked: false };
  }

  record.failures += 1;
  if (record.failures >= maxFailures) {
    record.lockedUntil = now + lockoutMs;
  }
  store.set(key, record);

  return record.lockedUntil
    ? { blocked: true, retryAfterMs: record.lockedUntil - now }
    : { blocked: false };
}

/** Zera o contador da chave (chamar após login bem-sucedido). */
export function resetLoginAttempts(key: string): void {
  store.delete(key);
}

/** Uso exclusivo de testes: limpa todo o store em memória. */
export function __resetRateLimitStore(): void {
  store.clear();
}
