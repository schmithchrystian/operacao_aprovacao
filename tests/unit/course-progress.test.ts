import { describe, expect, it } from "vitest";
import { computeCourseProgress } from "@/server/services/courses/progress";
import type { ModuleEntity } from "@/server/repositories/contracts/module-repository";
import type { LessonEntity } from "@/server/repositories/contracts/lesson-repository";
import type { LessonProgressEntity } from "@/server/repositories/contracts/lesson-progress-repository";

/**
 * Testes do núcleo puro de liberação sequencial/progresso (Fase 6 — CLAUDE.md §12/§25).
 * Fixtures sintéticas e isoladas (não dependem do catálogo mock real) para exercitar cada
 * regra de forma determinística.
 */

function lesson(id: string, moduleId: string, order: number, requiresLessonId: string | null = null): LessonEntity {
  return {
    id,
    moduleId,
    order,
    title: id,
    durationMinutes: 30,
    requiresLessonId,
    videoUrl: null,
    teacherId: null,
    status: "PUBLISHED",
    deletedAt: null,
  };
}

function courseModule(id: string, courseId: string, order: number): ModuleEntity {
  return {
    id,
    courseId,
    order,
    slug: id,
    title: id,
    subjectId: "subject-x",
    description: null,
    teacherId: null,
    status: "PUBLISHED",
    deletedAt: null,
  };
}

function progress(userId: string, lessonId: string, status: LessonProgressEntity["status"]): LessonProgressEntity {
  return {
    id: `${userId}:${lessonId}`,
    userId,
    lessonId,
    status,
    watchedPercent: status === "completed" ? 1 : status === "in_progress" ? 0.5 : 0,
    completedAt: status === "completed" ? "2026-01-01T00:00:00.000Z" : null,
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function progressMap(records: LessonProgressEntity[]): Map<string, LessonProgressEntity> {
  return new Map(records.map((record) => [record.lessonId, record]));
}

describe("computeCourseProgress — liberação sequencial", () => {
  const moduleA = courseModule("mod-a", "course-x", 1);
  const moduleB = courseModule("mod-b", "course-x", 2);
  const a1 = lesson("a1", "mod-a", 1);
  const a2 = lesson("a2", "mod-a", 2);
  const b1 = lesson("b1", "mod-b", 1);
  const b2 = lesson("b2", "mod-b", 2);

  it("a primeira aula do curso é sempre disponível, mesmo sem nenhum progresso registrado", () => {
    const result = computeCourseProgress(
      [
        { module: moduleA, lessons: [a1, a2] },
        { module: moduleB, lessons: [b1, b2] },
      ],
      progressMap([]),
    );

    const firstLesson = result.modules[0]?.lessons[0];
    expect(firstLesson?.lesson.id).toBe("a1");
    expect(firstLesson?.status).toBe("available");
  });

  it("a 1ª aula do curso é disponível mesmo com `requiresLessonId` não-nulo (Regra 1 prevalece)", () => {
    const a1WithPrereq = lesson("a1", "mod-a", 1, "external-lesson-never-completed");
    const result = computeCourseProgress(
      [{ module: moduleA, lessons: [a1WithPrereq, a2] }],
      progressMap([]),
    );

    expect(result.modules[0]?.lessons[0]?.status).toBe("available");
    expect(result.resumeLesson?.lesson.id).toBe("a1");
  });

  it("a 2ª aula do módulo fica bloqueada até a 1ª ser concluída", () => {
    const result = computeCourseProgress(
      [{ module: moduleA, lessons: [a1, a2] }],
      progressMap([progress("user-1", "a1", "in_progress")]),
    );

    const [lessonA1, lessonA2] = result.modules[0]!.lessons;
    expect(lessonA1?.status).toBe("in_progress");
    expect(lessonA2?.status).toBe("locked");
  });

  it("a 1ª aula do módulo 2 libera somente quando o módulo 1 está 100% concluído", () => {
    const partialResult = computeCourseProgress(
      [
        { module: moduleA, lessons: [a1, a2] },
        { module: moduleB, lessons: [b1, b2] },
      ],
      progressMap([progress("user-1", "a1", "completed")]), // módulo A ainda não 100%
    );
    expect(partialResult.modules[1]?.lessons[0]?.status).toBe("locked");

    const completeResult = computeCourseProgress(
      [
        { module: moduleA, lessons: [a1, a2] },
        { module: moduleB, lessons: [b1, b2] },
      ],
      progressMap([progress("user-1", "a1", "completed"), progress("user-1", "a2", "completed")]),
    );
    expect(completeResult.modules[1]?.lessons[0]?.status).toBe("available");
  });

  it("respeita pré-requisito explícito mesmo quando a regra sequencial já liberaria a aula", () => {
    const b2WithPrereq = lesson("b2", "mod-b", 2, "external-lesson-never-completed");
    const result = computeCourseProgress(
      [
        { module: moduleA, lessons: [a1, a2] },
        { module: moduleB, lessons: [b1, b2WithPrereq] },
      ],
      progressMap([
        progress("user-1", "a1", "completed"),
        progress("user-1", "a2", "completed"),
        progress("user-1", "b1", "completed"),
      ]),
    );

    // Sequencialmente, b2 estaria liberada (b1 concluída) — mas o pré-requisito
    // ("external-lesson-never-completed") nunca foi concluído, então continua bloqueada.
    expect(result.modules[1]?.lessons[1]?.status).toBe("locked");
    // Como a única aula restante está bloqueada (não "available"/"in_progress"), não há
    // ponto de retomada, mesmo o curso não estando 100% concluído.
    expect(result.resumeLesson).toBeNull();
    expect(result.courseProgressPercent).toBeCloseTo(75, 5); // 3 de 4 aulas concluídas
  });

  it("aponta a retomada para a primeira aula não concluída e já liberada", () => {
    const result = computeCourseProgress(
      [
        { module: moduleA, lessons: [a1, a2] },
        { module: moduleB, lessons: [b1, b2] },
      ],
      progressMap([progress("user-1", "a1", "completed"), progress("user-1", "a2", "in_progress")]),
    );

    expect(result.resumeLesson?.lesson.id).toBe("a2");
  });

  it("resumeLesson é null quando o curso está 100% concluído", () => {
    const result = computeCourseProgress(
      [{ module: moduleA, lessons: [a1, a2] }],
      progressMap([progress("user-1", "a1", "completed"), progress("user-1", "a2", "completed")]),
    );

    expect(result.resumeLesson).toBeNull();
    expect(result.courseProgressPercent).toBe(100);
  });

  it("calcula progresso por módulo e por curso corretamente", () => {
    const result = computeCourseProgress(
      [
        { module: moduleA, lessons: [a1, a2] },
        { module: moduleB, lessons: [b1, b2] },
      ],
      progressMap([progress("user-1", "a1", "completed"), progress("user-1", "a2", "completed")]),
    );

    expect(result.modules[0]?.progressPercent).toBe(100);
    expect(result.modules[0]?.status).toBe("completed");
    expect(result.modules[1]?.progressPercent).toBe(0);
    expect(result.modules[1]?.status).toBe("available"); // b1 liberada, ainda não iniciada
    expect(result.courseProgressPercent).toBe(50);
  });

  it("módulo fica com status 'locked' quando todas as suas aulas estão bloqueadas", () => {
    const result = computeCourseProgress(
      [
        { module: moduleA, lessons: [a1, a2] },
        { module: moduleB, lessons: [b1, b2] },
      ],
      progressMap([]), // módulo A nem iniciado -> módulo B inteiro bloqueado
    );

    expect(result.modules[1]?.status).toBe("locked");
  });
});
