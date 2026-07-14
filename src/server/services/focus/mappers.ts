import type { FocusSessionDTO } from "@/contracts/focus";
import type { FocusSessionEntity } from "@/server/repositories/contracts/focus-session-repository";

/** Converte a entidade persistida no DTO exposto à UI — nunca o inverso (DTO ≠ modelo
 *  persistido, docs/ARCHITECTURE.md §5). */
export function toFocusSessionDTO(entity: FocusSessionEntity): FocusSessionDTO {
  return {
    id: entity.id,
    mode: entity.mode,
    status: entity.status,
    startedAt: entity.startedAt,
    endedAt: entity.endedAt,
    targetSeconds: entity.targetSeconds,
    breakSeconds: entity.breakSeconds,
    elapsedSeconds: entity.activeSeconds,
    subjectId: entity.subjectId,
    topicId: entity.topicId,
    objective: entity.objective,
    cyclesPlanned: entity.cyclesPlanned,
    cyclesCompleted: entity.cyclesCompleted,
  };
}
