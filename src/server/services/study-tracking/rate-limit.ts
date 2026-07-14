import { STUDY_TRACKING } from "@/config/business";
import { mockStore } from "@/server/repositories/mock/mock-store";

/**
 * Rate limit LEVE do heartbeat (CLAUDE.md §24, "limitar requisições críticas") — em memória,
 * por processo. Mesma limitação documentada em `@/server/auth/rate-limit`: adequado ao MVP
 * single-instance; produção com múltiplas instâncias precisa de um store distribuído com a
 * mesma interface pública.
 *
 * Não é a validação de tempo válido em si (isso é `heartbeat-evaluator.ts`) — só impede um
 * cliente de martelar o endpoint mais rápido do que um player real enviaria heartbeats.
 *
 * Estado via `mockStore` (`@/server/repositories/mock/mock-store`) — compartilhado entre
 * instâncias de módulo (Next.js 16/Turbopack): sem isso, o heartbeat de vídeo
 * (`/api/progress/heartbeat`) não conseguia limitar corretamente chamadas que caíssem em
 * instâncias de módulo diferentes.
 */
const lastAcceptedAt = mockStore<Map<string, number>>("study-tracking-heartbeat-rate-limit", () => new Map());

export function heartbeatRateLimitKey(userId: string, lessonId: string, sessionId: string): string {
  return `${userId}:${lessonId}:${sessionId}`;
}

/** `true` quando a chamada é aceita (registra o instante); `false` quando está sendo limitada. */
export function checkHeartbeatRateLimit(key: string, now: number = Date.now()): boolean {
  const last = lastAcceptedAt.get(key);
  if (last !== undefined && now - last < STUDY_TRACKING.heartbeatMinClientIntervalMs) {
    return false;
  }
  lastAcceptedAt.set(key, now);
  return true;
}

/** Uso exclusivo de testes — limpa todo o store em memória. */
export function __resetHeartbeatRateLimitStore(): void {
  lastAcceptedAt.clear();
}
