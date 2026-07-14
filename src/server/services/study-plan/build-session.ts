import type { BuildSessionInput, GeneratedSessionDTO } from "@/contracts/study-session";
import { assertOwnership, requireUser } from "@/server/authorization";
import { resolveBlockContent } from "./content-resolver";
import { allocateSessionMinutes } from "./session-generator";

/**
 * "Montar estudo" (Fase 11 — agente `study-tracking`): gera uma sessão sob medida a partir do
 * tempo disponível + preferências do aluno. Autorização (ADR-0006): `requireUser` +
 * `assertOwnership` — a sessão é sempre montada para o próprio usuário autenticado.
 *
 * A ALOCAÇÃO de minutos (`allocateSessionMinutes`, puro) nunca depende de I/O; a RESOLUÇÃO de
 * conteúdo real por bloco (`resolveBlockContent`) é I/O mas só de LEITURA — `buildSession` não
 * grava nada (a gravação só acontece em `startStudyMission`, quando o aluno de fato inicia a
 * missão), então pode ser chamada livremente para pré-visualizar a sessão quantas vezes o
 * aluno quiser ajustar os filtros.
 */
export async function buildSession(userId: string, input: BuildSessionInput): Promise<GeneratedSessionDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const allocations = allocateSessionMinutes(input.availableMinutes, input.contentTypes);

  const blocks = await Promise.all(
    allocations.map(async (allocation) => {
      const resolved = await resolveBlockContent(userId, allocation.type, input);
      return {
        type: allocation.type,
        label: allocation.label,
        title: resolved.title,
        minutes: allocation.minutes,
        contentRef: resolved.contentRef,
      };
    }),
  );

  return {
    totalMinutes: input.availableMinutes,
    blocks,
    contestId: input.contestId ?? null,
    courseId: input.courseId ?? null,
    subjectId: input.subjectId ?? null,
    topicId: input.topicId ?? null,
  };
}
