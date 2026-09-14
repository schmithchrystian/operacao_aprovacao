import { env } from "@/config/env";
import { getRepositories } from "@/server/repositories";
import {
  listPrismaStudyActivitySamples,
  type StudyActivitySample,
} from "@/server/repositories/prisma/study-activity-repository";
export type { StudyActivitySample };
/** Production metrics use accepted activity deltas from video AND focus, not mutable session totals. */
export async function listUserActivitySamples(userId: string): Promise<StudyActivitySample[]> {
  if (env.DATA_SOURCE === "prisma") return listPrismaStudyActivitySamples(userId);
  return (
    await getRepositories().studySessions.listRecentSessionsByUserId(
      userId,
      new Date(0).toISOString(),
    )
  ).map((row) => ({ ...row, subjectId: null }));
}
