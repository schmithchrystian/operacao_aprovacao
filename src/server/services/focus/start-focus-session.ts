import type { FocusSessionDTO, PomodoroConfigInput } from "@/contracts/focus";
import { auditLog } from "@/server/audit";
import { assertOwnership, requireUser } from "@/server/authorization";
import { getRepositories } from "@/server/repositories";
import { withFocusLock } from "./focus-lock";
import { toFocusSessionDTO } from "./mappers";
import { resolveFocusModeDurations } from "./resolve-mode";

/**
 * Inicia uma sessão de Modo Foco/Pomodoro (Fase 15). Autorização: `requireUser` + `assertOwnership`
 * (ADR-0006) — `userId` sempre da sessão real do Auth.js, nunca do corpo da requisição.
 *
 * SESSÃO ATIVA DUPLICADA (decisão desta fase, documentada — CLAUDE.md §14 "sessões simultâneas
 * suspeitas"): no máximo UMA sessão `ACTIVE` por usuário. Iniciar uma nova sessão DESCARTA
 * (`DISCARDED`) qualquer sessão ainda ativa do mesmo usuário, em vez de rejeitar o novo início:
 * (a) evita travar o aluno se ele perder o `sessionId` anterior (aba fechada, crash do
 * navegador — sem isso ele nunca mais conseguiria iniciar um novo Pomodoro); (b) fecha a janela
 * de "farm" de duas sessões simultâneas pontuando cada uma pelo mesmo intervalo real de tempo.
 * Uma sessão `DISCARDED` nunca pode ser finalizada/pontuada depois (`finishFocusSession` exige
 * `status === "ACTIVE"`). O tempo já acumulado na sessão descartada é perdido (não pontua) —
 * custo aceito em troca de nunca bloquear o aluno e de fechar a brecha de dupla pontuação.
 *
 * A leitura+descarte+criação roda dentro de `withFocusLock(userId, ...)` para serializar starts
 * concorrentes do MESMO usuário (2 cliques rápidos no "iniciar" não podem deixar 2 sessões
 * `ACTIVE` simultâneas) — mesmo padrão de `@/server/services/flashcards/review-lock.ts`.
 */
export async function startFocusSession(
  userId: string,
  input: PomodoroConfigInput,
  now: Date = new Date(),
): Promise<FocusSessionDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const { targetSeconds, breakSeconds } = resolveFocusModeDurations(input);
  const repos = getRepositories();

  return withFocusLock(userId, async () => {
    const active = await repos.focusSessions.findActiveByUserId(userId);
    if (active) {
      const nowIso = now.toISOString();
      await repos.focusSessions.save({
        ...active,
        status: "DISCARDED",
        endedAt: nowIso,
        updatedAt: nowIso,
      });
      auditLog({
        operation: "focus.session-discarded-by-new-start",
        userId,
        entity: "FocusSession",
        entityId: active.id,
        result: "success",
        correlationId: active.id,
        metadata: { activeSeconds: active.activeSeconds },
      });
    }

    const created = await repos.focusSessions.create({
      userId,
      mode: input.mode,
      targetSeconds,
      breakSeconds,
      subjectId: input.subjectId ?? null,
      topicId: input.topicId ?? null,
      objective: input.objective ?? null,
      now,
    });

    auditLog({
      operation: "focus.session-started",
      userId,
      entity: "FocusSession",
      entityId: created.id,
      result: "success",
      correlationId: created.id,
      metadata: { mode: input.mode, targetSeconds },
    });

    return toFocusSessionDTO(created);
  });
}
