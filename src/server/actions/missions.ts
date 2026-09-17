"use server";
import { z } from "zod";
import { fail, ok, type ActionResult, idSchema } from "@/contracts/common";
import type { StudyMissionDTO } from "@/contracts/study-session";
import { isDomainError } from "@/server/errors";
import { parseInput } from "@/server/validation";
import {
  getMyMission,
  listMyMissions,
  advanceMyMission,
} from "@/server/services/study-plan/missions";
export async function getMyMissionAction(raw: unknown): Promise<ActionResult<StudyMissionDTO>> {
  try {
    return ok(await getMyMission(parseInput(z.object({ id: idSchema }), raw).id));
  } catch (error) {
    return isDomainError(error)
      ? fail(error.code, error.message)
      : fail("INTERNAL_ERROR", "Não foi possível carregar a missão.");
  }
}
export async function listMyMissionsAction(): Promise<ActionResult<StudyMissionDTO[]>> {
  try {
    return ok(await listMyMissions());
  } catch (error) {
    return isDomainError(error)
      ? fail(error.code, error.message)
      : fail("INTERNAL_ERROR", "Não foi possível carregar as missões.");
  }
}
export async function advanceMyMissionAction(raw: unknown): Promise<ActionResult<StudyMissionDTO>> {
  try {
    const input = parseInput(
      z.object({ id: idSchema, expectedBlockIndex: z.number().int().min(0) }),
      raw,
    );
    return ok(await advanceMyMission(input.id, input.expectedBlockIndex));
  } catch (error) {
    return isDomainError(error)
      ? fail(error.code, error.message)
      : fail("INTERNAL_ERROR", "Não foi possível atualizar a missão.");
  }
}
