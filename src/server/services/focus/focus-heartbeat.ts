import { withFocusLock } from "./focus-lock";
import { reserveInterval } from "@/server/concurrency/rate-limit";
import type { FocusHeartbeatInput, FocusHeartbeatResultDTO } from "@/contracts/focus";
import { assertOwnership, requireUser } from "@/server/authorization";
import { ConflictError, NotFoundError, RateLimitError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import { evaluateFocusHeartbeat } from "./focus-heartbeat-evaluator";
import { checkFocusHeartbeatRateLimit, focusHeartbeatRateLimitKey } from "./focus-rate-limit";
import { toFocusSessionDTO } from "./mappers";

/**
 * Recebe um heartbeat do timer de Modo Foco (sinais BRUTOS — aba visível/interação recente,
 * nunca "concluído") e acumula tempo ATIVO no servidor (Fase 15, mesmo princípio da Fase 7 —
 * `@/server/services/study-tracking/record-heartbeat.ts`). Autorização (ADR-0006): `requireUser`
 * + `assertOwnership`; a busca por `(userId, sessionId)` já escopa por dono — uma sessão de
 * outro usuário nunca é encontrada (anti-IDOR "por construção",
 * `FocusSessionRepository.findById`).
 *
 * Só aceita heartbeats de uma sessão `ACTIVE` — uma sessão já `FINISHED`/`DISCARDED` rejeita
 * com `ConflictError` (nunca reabre/recomputa uma sessão encerrada).
 *
 * Rate limit LEVE (CLAUDE.md §24) com store próprio deste domínio (`./focus-rate-limit.ts`).
 */
async function focusHeartbeatLocked(
  userId: string,
  input: FocusHeartbeatInput,
  now: Date = new Date(),
): Promise<FocusHeartbeatResultDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const receivedAt = now.getTime();
  const rateLimitKey = focusHeartbeatRateLimitKey(userId, input.sessionId);
  if (!await reserveInterval(`focus-heartbeat:${userId}`, 1000, () => checkFocusHeartbeatRateLimit(rateLimitKey, receivedAt))) {
    throw new RateLimitError("Heartbeat de foco enviado com frequência excessiva.");
  }

  const repos = getRepositories();
  const existing = await repos.focusSessions.findById(userId, input.sessionId);
  if (!existing) {
    throw new NotFoundError("Sessão de foco não encontrada.");
  }
  if (existing.status !== "ACTIVE") {
    throw new ConflictError("Esta sessão de foco não está mais ativa.");
  }

  const evaluation = evaluateFocusHeartbeat({
    signal: {
      tabVisible: input.tabVisible,
      interacting: input.interacting,
      clientTimestamp: input.clientTimestamp,
    },
    receivedAt,
    previousSession: existing,
  });

  const saved = await repos.focusSessions.save(evaluation.updatedSession);

  return { session: toFocusSessionDTO(saved), flags: evaluation.flags };
}

export async function focusHeartbeat(...args: Parameters<typeof focusHeartbeatLocked>): ReturnType<typeof focusHeartbeatLocked> { return withFocusLock(args[0], () => focusHeartbeatLocked(...args)); }
