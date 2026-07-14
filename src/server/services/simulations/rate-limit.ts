import { RateLimitError } from "@/server/errors";
import { mockStore } from "@/server/repositories/mock/mock-store";

/**
 * Rate limit LEVE das ações de simulado (CLAUDE.md §24, "limitar requisições críticas") — em
 * memória, por processo. Mesma limitação documentada em `@/server/auth/rate-limit` e
 * `@/server/services/study-tracking/rate-limit`: adequado ao MVP single-instance; produção com
 * múltiplas instâncias precisa de um store distribuído com a MESMA interface pública.
 *
 * Impede um cliente de martelar `createAttemptAction` (que grava um registro — e, no modo
 * personalizado, um `MockExam` ad-hoc — por chamada) ou `submitAttemptAction`. NÃO substitui
 * nenhuma outra defesa (autorização/idempotência/anti-dupla-finalização continuam no service).
 *
 * Estado via `mockStore` (`@/server/repositories/mock/mock-store`) — compartilhado entre
 * instâncias de módulo (Next.js 16/Turbopack).
 */
const lastAcceptedAt = mockStore<Map<string, number>>("simulations-rate-limit", () => new Map());

export type SimulationsRateLimitedAction = "create-attempt" | "submit-attempt";

export function simulationsRateLimitKey(userId: string, action: SimulationsRateLimitedAction): string {
  return `${action}:${userId}`;
}

/** `true` quando a chamada é aceita (registra o instante); `false` quando está sendo limitada. */
export function checkSimulationsRateLimit(
  key: string,
  minIntervalMs: number,
  now: number = Date.now(),
): boolean {
  const last = lastAcceptedAt.get(key);
  if (last !== undefined && now - last < minIntervalMs) {
    return false;
  }
  lastAcceptedAt.set(key, now);
  return true;
}

/**
 * Aplica o rate limit e LANÇA `RateLimitError` quando excedido (uso na fronteira das actions).
 * Mantém a checagem pura (`checkSimulationsRateLimit`) reutilizável e testável isoladamente.
 */
export function assertSimulationsRateLimit(
  userId: string,
  action: SimulationsRateLimitedAction,
  minIntervalMs: number,
  now: number = Date.now(),
): void {
  if (!checkSimulationsRateLimit(simulationsRateLimitKey(userId, action), minIntervalMs, now)) {
    throw new RateLimitError("Muitas solicitações de simulado em sequência. Aguarde alguns instantes.");
  }
}

/** Uso exclusivo de testes — limpa todo o store em memória. */
export function __resetSimulationsRateLimitStore(): void {
  lastAcceptedAt.clear();
}
