import type { StudyMissionDTO } from "@/contracts/study-session";
import { requireUser } from "@/server/authorization";
import { ConflictError, NotFoundError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import type { StudyMissionEntity } from "@/server/repositories/contracts/study-mission-repository";
import { inRepositoryTransaction } from "@/server/repositories/transaction";
import { auditLog } from "@/server/audit";
function toDTO(row: StudyMissionEntity): StudyMissionDTO {
  return {
    id: row.id,
    status: row.status,
    startedAt: row.startedAt,
    totalMinutes: row.totalMinutes,
    blocks: row.blocks,
    currentBlockIndex: row.currentBlockIndex,
  };
}
export async function getMyMission(id: string): Promise<StudyMissionDTO> {
  const { userId } = await requireUser();
  const row = await getRepositories().studyMissions.findById(userId, id);
  if (!row) throw new NotFoundError("Missão não encontrada.");
  return toDTO(row);
}
export async function listMyMissions(): Promise<StudyMissionDTO[]> {
  const { userId } = await requireUser();
  return (await getRepositories().studyMissions.listByUserId(userId)).map(toDTO);
}
/** Tracks the plan only; marking a block done never grants study time or rewards. */
export async function advanceMyMission(
  id: string,
  expectedBlockIndex: number,
): Promise<StudyMissionDTO> {
  return inRepositoryTransaction(async () => {
    const { userId } = await requireUser();
    const repo = getRepositories().studyMissions;
    const existing = await repo.findById(userId, id);
    if (!existing) throw new NotFoundError("Missão não encontrada.");
    const wasFinished = existing.status === "FINISHED";
    const row = await repo.advance(userId, id, expectedBlockIndex, new Date());
    if (!row) throw new ConflictError("A missão mudou em outra janela. Atualize para continuar.");
    if (!wasFinished)
      await auditLog({
        operation:
          row.status === "FINISHED" ? "study-plan.finish-mission" : "study-plan.advance-mission",
        userId,
        entity: "StudyMission",
        entityId: id,
        correlationId: id,
        result: "success",
      });
    return toDTO(row);
  });
}
