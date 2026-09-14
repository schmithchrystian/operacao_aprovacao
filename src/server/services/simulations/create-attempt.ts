import type { AttemptDTO, MockExamConfigInput } from "@/contracts/simulations";
import { auditLog } from "@/server/audit";
import { assertOwnership, requireUser } from "@/server/authorization";
import { getRepositories } from "@/server/repositories";
import { buildAttemptDTO } from "./mappers";
import { resolveMockExamForConfig } from "./question-pool";

/**
 * Cria uma nova tentativa de simulado (CLAUDE.md §18, fluxo: 1. criar tentativa; 2. registrar
 * questões selecionadas; 3. registrar horário de início). Autorização (ADR-0006): `requireUser`
 * + `assertOwnership` — a tentativa é sempre criada em nome do próprio usuário autenticado.
 *
 * `startedAt`/`status` são registrados pelo SERVIDOR (`MockExamAttemptRepository.create`) —
 * nunca aceitos de um valor do cliente. O DTO retornado NUNCA contém gabarito (`AttemptDTO`
 * estruturalmente não tem `isCorrect` em lugar nenhum — ver `@/contracts/simulations`).
 */
export async function createAttempt(userId: string, config: MockExamConfigInput): Promise<AttemptDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const repos = getRepositories();
  const { mockExamId, timeLimitSeconds } = await resolveMockExamForConfig(userId, config);

  const now = new Date();
  const attempt = await repos.mockExamAttempts.create({ userId, mockExamId, timeLimitSeconds, now });

  await auditLog({
    operation: "simulations.create-attempt",
    userId,
    entity: "MockExamAttempt",
    entityId: attempt.id,
    result: "success",
    correlationId: attempt.id,
    metadata: { mockExamId, timeLimitSeconds },
  });

  return buildAttemptDTO(attempt, now);
}
