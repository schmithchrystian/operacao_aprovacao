import { STUDY_TRACKING } from "@/config/business";

/**
 * Rate limit LEVE do heartbeat (CLAUDE.md §24, "limitar requisições críticas") — em memória,
 * por processo. Mesma limitação documentada em `@/server/auth/rate-limit`: adequado ao MVP
 * single-instance; produção com múltiplas instâncias precisa de um store distribuído com a
 * mesma interface pública.
 *
 * Não é a validação de tempo válido em si (isso é `heartbeat-evaluator.ts`) — só impede um
 * cliente de martelar o endpoint mais rápido do que um player real enviaria heartbeats.
 */
const lastAcceptedAt = new Map<string, number>();

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
