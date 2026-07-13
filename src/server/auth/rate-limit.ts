import { LOGIN_RATE_LIMIT } from "@/config/business";

/**
 * Rate limiting / lockout de login em MEMÓRIA (CLAUDE.md §24, achado de segurança Fase 4).
 *
 * ⚠️ Store por processo — adequado ao MVP single-instance. Em produção com múltiplas
 * instâncias/serverless DEVE virar um store distribuído (Redis/Upstash, KV etc.) com a
 * MESMA interface pública deste módulo; só a implementação interna muda. Nunca depender
 * disto como única defesa: é complementar à autenticação, não substitui.
 *
 * A chave combina e-mail (normalizado) e, quando disponível, o IP do cliente — ver
 * `buildRateLimitKey`. Contagem por janela deslizante simples: `maxFailures` falhas dentro
 * de `windowMs` disparam bloqueio por `lockoutMs` (valores em `config/business.ts`).
 */

interface AttemptRecord {
  failures: number;
  /** Início da janela de contagem atual (ms epoch). */
  windowStart: number;
  /** Enquanto `now < lockedUntil`, a chave está bloqueada (ms epoch). */
  lockedUntil?: number;
}

const store = new Map<string, AttemptRecord>();

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
