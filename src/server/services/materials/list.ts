import { env } from "@/config/env";
import { listMaterialRecords } from "@/server/repositories/prisma/material-repository";
/** Invoke after checking access to the lesson; return protected links, never storage keys. */
export async function listLessonMaterials(lessonId: string) {
  if (env.DATA_SOURCE !== "prisma") return [];
  return (await listMaterialRecords(lessonId)).map((r) => ({
    id: r.id,
    title: r.title,
    url: `/api/materials/${encodeURIComponent(r.id)}`,
  }));
}
