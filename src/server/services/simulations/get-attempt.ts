import type { AttemptDTO, AttemptResultDTO, AttemptStatusDTO } from "@/contracts/simulations";
import { assertOwnership, requireUser } from "@/server/authorization";
import { ConflictError, NotFoundError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import { buildAttemptDTO, buildAttemptResultDTO } from "./mappers";

/**
 * Lê uma tentativa EM ANDAMENTO para o aluno continuar respondendo. Nunca retorna gabarito
 * (`AttemptDTO`) e rejeita ler uma tentativa já finalizada (o cliente deve usar `getResult`).
 *
 * Autorização em duas camadas (ADR-0006, anti-IDOR): `assertOwnership(userId, session.userId)`
 * garante que o chamador só pode consultar em nome de si mesmo; `assertOwnership(attempt.userId,
 * userId)` garante que a TENTATIVA pertence a esse usuário — sem essa segunda checagem, um
 * usuário autenticado poderia ler a tentativa de qualquer outro só adivinhando o `attemptId`.
 */
export async function getAttemptForTaking(userId: string, attemptId: string): Promise<AttemptDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const repos = getRepositories();
  const attempt = await repos.mockExamAttempts.findById(attemptId);
  if (!attempt) {
    throw new NotFoundError("Tentativa não encontrada.");
  }
  assertOwnership(attempt.userId, userId);

  if (attempt.status !== "IN_PROGRESS") {
    throw new ConflictError("Esta tentativa já foi finalizada.");
  }

  return buildAttemptDTO(attempt);
}

/**
 * Lê o resultado (gabarito + métricas) de uma tentativa já corrigida. Rejeita ler o resultado
 * de uma tentativa ainda `IN_PROGRESS`/`EXPIRED`/`CANCELLED` — o gabarito só existe depois da
 * correção real (CLAUDE.md §18/§25).
 */
export async function getResult(userId: string, attemptId: string): Promise<AttemptResultDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const repos = getRepositories();
  const attempt = await repos.mockExamAttempts.findById(attemptId);
  if (!attempt) {
    throw new NotFoundError("Tentativa não encontrada.");
  }
  assertOwnership(attempt.userId, userId);

  if (attempt.status !== "FINISHED") {
    throw new ConflictError("Esta tentativa ainda não foi corrigida.");
  }

  return buildAttemptResultDTO(attempt);
}

/**
 * Lê apenas o STATUS (+ metadados não sensíveis) de uma tentativa, sem questões e sem gabarito.
 * Usado pelas telas para rotear por status explícito e renderizar um estado terminal quando a
 * tentativa está EXPIRED/CANCELLED — em vez de a página de resolução e a de resultado
 * redirecionarem uma para a outra às cegas em cima de um `CONFLICT` (o que causava um loop de
 * redirect para tentativas em estado terminal — achado de segurança Fase 10 — MÉDIO).
 *
 * Mesma dupla checagem de propriedade das demais leituras (anti-IDOR, ADR-0006).
 */
export async function getAttemptStatus(userId: string, attemptId: string): Promise<AttemptStatusDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const repos = getRepositories();
  const attempt = await repos.mockExamAttempts.findById(attemptId);
  if (!attempt) {
    throw new NotFoundError("Tentativa não encontrada.");
  }
  assertOwnership(attempt.userId, userId);

  const exam = await repos.mockExams.findById(attempt.mockExamId);

  return {
    attemptId: attempt.id,
    mockExamId: attempt.mockExamId,
    mockExamTitle: exam?.title ?? null,
    status: attempt.status,
    startedAt: attempt.startedAt,
    finishedAt: attempt.finishedAt,
    totalQuestions: exam?.questionIds.length ?? 0,
  };
}
