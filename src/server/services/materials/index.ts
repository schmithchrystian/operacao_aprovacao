import { inRepositoryTransaction } from "@/server/repositories/transaction";
import { randomUUID } from "node:crypto";
import { env } from "@/config/env";
import { requireRole, requireUser } from "@/server/authorization";
import { auditLog } from "@/server/audit/log";
import { ValidationError, NotFoundError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import {
  getMaterialRecord,
  createMaterialRecord,
} from "@/server/repositories/prisma/material-repository";
import { uploadPdf, removePdf, signedPdfUrl } from "@/server/storage/supabase";
import { getLessonView } from "@/server/services/study-tracking/lesson-view";
import { validatedVideoUrl } from "@/server/services/courses/media-url";

export const MAX_MATERIAL_BYTES = 4 * 1024 * 1024;
export function validatePdf(file: File, bytes: Uint8Array) {
  if (
    file.size === 0 ||
    file.size > MAX_MATERIAL_BYTES ||
    bytes.length > MAX_MATERIAL_BYTES ||
    file.type !== "application/pdf" ||
    Buffer.from(bytes.subarray(0, 5)).toString() !== "%PDF-"
  )
    throw new ValidationError("Envie um PDF válido de até 4 MB.");
}
export async function addLessonMaterial(lessonId: string, title: string, file: File) {
  const session = await requireRole("admin", "moderador");
  if (env.DATA_SOURCE !== "prisma")
    throw new ValidationError("Envio de materiais requer banco e armazenamento configurados.");
  if (!title.trim() || title.length > 160 || !lessonId || lessonId.length > 128)
    throw new ValidationError("Informe aula e título válidos.");
  const lesson = await getRepositories().lessons.findById(lessonId);
  if (!lesson || lesson.deletedAt) throw new NotFoundError();
  if (file.size === 0 || file.size > MAX_MATERIAL_BYTES)
    throw new ValidationError("Envie um PDF válido de até 4 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  validatePdf(file, bytes);
  const key = `lessons/${lessonId.replace(/[^a-zA-Z0-9_-]/g, "")}/${randomUUID()}.pdf`;
  await uploadPdf(key, bytes);
  try {
    return await inRepositoryTransaction(async () => {
      const material = await createMaterialRecord(lessonId, title.trim(), key);
      await auditLog({
        operation: "materials.upload",
        entity: "LessonMaterial",
        entityId: material.id,
        userId: session.userId,
        result: "success",
        correlationId: material.id,
      });
      return material.id;
    });
  } catch (error) {
    await removePdf(key).catch(() => undefined);
    throw error;
  }
}
export async function resolveMaterialDownload(id: string) {
  const session = await requireUser();
  const record = await getMaterialRecord(id);
  if (!record) throw new NotFoundError();
  const repos = getRepositories();
  const lesson = await repos.lessons.findById(record.lessonId);
  const lessonModule = lesson ? await repos.modules.findById(lesson.moduleId) : null;
  const course = lessonModule ? await repos.courses.findById(lessonModule.courseId) : null;
  if (!lesson || !lessonModule || !course) throw new NotFoundError();
  await getLessonView(session.userId, course.slug, lessonModule.slug, lesson.id);
  if (record.url.startsWith("storage:")) return signedPdfUrl(record.url.slice(8));
  const url = validatedVideoUrl(record.url);
  if (!url) throw new NotFoundError();
  return url;
}
