import type { BuildSessionInput, StartStudyMissionResultDTO } from "@/contracts/study-session";
import { auditLog } from "@/server/audit";
import { assertOwnership, requireUser } from "@/server/authorization";
import { ConflictError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import { buildSession } from "./build-session";

/**
 * "Iniciar missão de estudo" (Fase 11 — agente `study-tracking`): registra que o aluno começou
 * a executar uma sessão gerada e devolve o ponto de partida (1º bloco).
 *
 * Regenera a sessão a partir do MESMO `BuildSessionInput` em vez de aceitar a lista de blocos
 * já pronta do cliente — a geração é determinística e só faz LEITURA (`buildSession` não grava
 * nada), então recalcular no servidor custa pouco e evita confiar num payload de
 * blocos/minutos vindo do cliente (mesma cautela geral do projeto com entrada crítica, mesmo
 * este domínio não sendo pontuado/fraudável como aula/simulado).
 *
 * Autorização (ADR-0006): `requireUser` + `assertOwnership`.
 */
export async function startStudyMission(
  userId: string,
  input: BuildSessionInput,
): Promise<StartStudyMissionResultDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const generated = await buildSession(userId, input);
  const startingBlock = generated.blocks[0];
  if (!startingBlock) {
    throw new ConflictError("Não foi possível montar nenhum bloco para esta sessão.");
  }

  const repos = getRepositories();
  const now = new Date();
  const mission = await repos.studyMissions.create({
    userId,
    blocks: generated.blocks,
    totalMinutes: generated.totalMinutes,
    now,
  });

  await auditLog({
    operation: "study-plan.start-mission",
    userId,
    entity: "StudyMission",
    entityId: mission.id,
    result: "success",
    correlationId: mission.id,
    metadata: { totalMinutes: mission.totalMinutes, blockCount: mission.blocks.length },
  });

  return {
    mission: {
      id: mission.id,
      status: mission.status,
      startedAt: mission.startedAt,
      totalMinutes: mission.totalMinutes,
      blocks: mission.blocks,
      currentBlockIndex: mission.currentBlockIndex,
    },
    startingBlock,
  };
}
