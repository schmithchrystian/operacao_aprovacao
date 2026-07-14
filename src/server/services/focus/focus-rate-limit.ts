import { FOCUS } from "@/config/business";
import { mockStore } from "@/server/repositories/mock/mock-store";

/**
 * Rate limit LEVE do heartbeat de Modo Foco (CLAUDE.md §24, "limitar requisições críticas") —
 * em memória, por processo. Cópia independente do MESMO padrão usado em
 * `@/server/services/study-tracking/rate-limit`/`@/server/services/simulations/rate-limit`/
 * `@/server/services/flashcards/rate-limit` — convenção já estabelecida neste projeto (cada
 * domínio mantém seu próprio store pequeno, em vez de compartilhar um módulo central; ver o
 * comentário equivalente em `@/server/services/flashcards/review-lock.ts`).
 *
 * Não é a validação de tempo válido em si (isso é `focus-heartbeat-evaluator.ts`) — só impede um
 * cliente de martelar o endpoint mais rápido do que um timer real enviaria heartbeats.
 *
 * Estado via `mockStore` (`@/server/repositories/mock/mock-store`) — compartilhado entre
 * instâncias de módulo (Next.js 16/Turbopack).
 */
const lastAcceptedAt = mockStore<Map<string, number>>("focus-heartbeat-rate-limit", () => new Map());

export function focusHeartbeatRateLimitKey(userId: string, sessionId: string): string {
  return `${userId}:${sessionId}`;
}

/** `true` quando a chamada é aceita (registra o instante); `false` quando está sendo limitada. */
export function checkFocusHeartbeatRateLimit(key: string, now: number = Date.now()): boolean {
  const last = lastAcceptedAt.get(key);
  if (last !== undefined && now - last < FOCUS.heartbeatMinClientIntervalMs) {
    return false;
  }
  lastAcceptedAt.set(key, now);
  return true;
}

/** Uso exclusivo de testes — limpa todo o store em memória. */
export function __resetFocusHeartbeatRateLimitStore(): void {
  lastAcceptedAt.clear();
}
