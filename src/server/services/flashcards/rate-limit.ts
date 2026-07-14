import { RateLimitError } from "@/server/errors";

/**
 * Rate limit LEVE de `reviewCardAction` (CLAUDE.md §24, "limitar requisições críticas") — em
 * memória, por processo. DEFESA EM PROFUNDIDADE do achado de segurança A1: a barreira PRINCIPAL
 * contra o farm de pontos por corrida é o mutex por `(userId, flashcardId)` + o gate "devido"
 * dentro do service (`./review-card.ts`/`./review-lock.ts`); este rate limit só freia o martelar
 * cru do endpoint antes mesmo de tocar o service.
 *
 * Mesma limitação/estilo de `@/server/services/simulations/rate-limit` e
 * `@/server/services/study-tracking/rate-limit`: adequado ao MVP single-instance; produção com
 * múltiplas instâncias precisa de um store distribuído com a MESMA interface pública.
 *
 * Chave por `(userId, flashcardId)` (não por usuário) DE PROPÓSITO: uma sessão de revisão
 * legítima percorre cartões DIFERENTES em sequência e nunca deve ser limitada — só o martelar do
 * MESMO cartão é freado (que o gate "devido" já rejeitaria de qualquer forma).
 */
const lastAcceptedAt = new Map<string, number>();

export function reviewCardRateLimitKey(userId: string, flashcardId: string): string {
  return `review-card:${userId}:${flashcardId}`;
}

/** `true` quando a chamada é aceita (registra o instante); `false` quando está sendo limitada. */
export function checkFlashcardsRateLimit(key: string, minIntervalMs: number, now: number = Date.now()): boolean {
  const last = lastAcceptedAt.get(key);
  if (last !== undefined && now - last < minIntervalMs) {
    return false;
  }
  lastAcceptedAt.set(key, now);
  return true;
}

/**
 * Aplica o rate limit e LANÇA `RateLimitError` quando excedido (uso na fronteira das actions).
 * Mantém a checagem pura (`checkFlashcardsRateLimit`) reutilizável e testável isoladamente.
 */
export function assertReviewCardRateLimit(
  userId: string,
  flashcardId: string,
  minIntervalMs: number,
  now: number = Date.now(),
): void {
  if (!checkFlashcardsRateLimit(reviewCardRateLimitKey(userId, flashcardId), minIntervalMs, now)) {
    throw new RateLimitError("Muitas revisões em sequência para este cartão. Aguarde alguns instantes.");
  }
}

/** Uso exclusivo de testes — limpa todo o store em memória. */
export function __resetFlashcardsRateLimitStore(): void {
  lastAcceptedAt.clear();
}
