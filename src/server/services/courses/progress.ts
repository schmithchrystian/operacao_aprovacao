import type { LessonEntity } from "@/server/repositories/contracts/lesson-repository";
import type { ModuleEntity } from "@/server/repositories/contracts/module-repository";
import type { LessonProgressEntity } from "@/server/repositories/contracts/lesson-progress-repository";
import type { LessonStatus } from "@/contracts/courses";

/**
 * Núcleo PURO (sem I/O, sem `getRepositories`) da regra de liberação de aulas/progresso
 * agregado (CLAUDE.md §12, Fase 6). Recebe módulos+aulas já carregados e um mapa de
 * progresso, devolve status/progresso computados — fácil de testar isoladamente
 * (`tests/unit/course-progress.test.ts`) sem depender de mocks de repositório/sessão.
 *
 * Regras de liberação (a Regra 1 tem precedência ABSOLUTA sobre as demais):
 * 1. a primeira aula do curso (1º módulo, 1ª aula) é SEMPRE disponível (nunca `locked`),
 *    mesmo que tivesse um `requiresLessonId` não-nulo — a Regra 1 prevalece sobre o
 *    pré-requisito (Regra 4);
 * 2. a N-ésima aula de um módulo (N > 1) libera quando a aula anterior do MESMO módulo
 *    está `completed`;
 * 3. a 1ª aula de um módulo (exceto o 1º módulo) libera quando TODAS as aulas do módulo
 *    anterior estão `completed`;
 * 4. quando a aula tem `requiresLessonId`, o pré-requisito precisa estar `completed`
 *    ALÉM da regra sequencial (2–3) — ambas precisam valer para liberar (exceto a 1ª aula
 *    do curso, ver Regra 1).
 *
 * FRONTEIRA: o status de cada `LessonProgressEntity` (se está `completed`/`in_progress`)
 * já vem pronto do agente `study-tracking` (heartbeat/tempo válido) — este módulo nunca
 * recalcula percentual assistido, só decide liberação e agrega contagens.
 */

export interface ModuleWithLessons {
  module: ModuleEntity;
  lessons: LessonEntity[];
}

export interface ComputedLesson {
  lesson: LessonEntity;
  status: LessonStatus;
}

export interface ComputedModule {
  module: ModuleEntity;
  lessons: ComputedLesson[];
  status: LessonStatus;
  /** Percentual (0–100) de aulas concluídas no módulo. */
  progressPercent: number;
}

export interface ResumeLesson {
  moduleId: string;
  lesson: LessonEntity;
}

export interface ComputedCourseProgress {
  modules: ComputedModule[];
  /** Percentual (0–100) de aulas concluídas no curso inteiro. */
  courseProgressPercent: number;
  /** Primeira aula não concluída e já liberada (ponto de retomada); `null` quando o curso
   * está 100% concluído (nada a retomar) ou não possui nenhuma aula. */
  resumeLesson: ResumeLesson | null;
}

function rollUpModuleStatus(lessons: readonly ComputedLesson[]): LessonStatus {
  if (lessons.length === 0) return "locked";
  if (lessons.every((item) => item.status === "locked")) return "locked";
  if (lessons.every((item) => item.status === "completed")) return "completed";
  if (lessons.some((item) => item.status === "completed" || item.status === "in_progress")) {
    return "in_progress";
  }
  return "available";
}

export function computeCourseProgress(
  modulesWithLessons: readonly ModuleWithLessons[],
  progressByLessonId: ReadonlyMap<string, LessonProgressEntity>,
): ComputedCourseProgress {
  const sortedModules = [...modulesWithLessons].sort((a, b) => a.module.order - b.module.order);

  const computedModules: ComputedModule[] = [];
  let resumeLesson: ResumeLesson | null = null;
  let previousModuleCompleted = true; // não há módulo anterior ao primeiro
  let totalLessons = 0;
  let totalCompleted = 0;

  sortedModules.forEach(({ module: currentModule, lessons }, moduleIndex) => {
    const sortedLessons = [...lessons].sort((a, b) => a.order - b.order);
    const computedLessons: ComputedLesson[] = [];
    let previousLessonCompletedInModule = true; // regra da 1ª aula do módulo vem do módulo anterior
    let moduleCompletedCount = 0;

    sortedLessons.forEach((lesson, index) => {
      const progress = progressByLessonId.get(lesson.id);
      const isCompleted = progress?.status === "completed";
      const isInProgress = progress?.status === "in_progress";

      const prerequisiteMet = lesson.requiresLessonId
        ? progressByLessonId.get(lesson.requiresLessonId)?.status === "completed"
        : true;

      const sequentialUnlocked =
        index === 0 ? previousModuleCompleted : previousLessonCompletedInModule;

      // Regra 1 tem precedência absoluta: a primeiríssima aula do curso (1º módulo, 1ª aula)
      // está SEMPRE liberada — nem a regra sequencial nem um `requiresLessonId` a bloqueiam.
      const isFirstLessonOfCourse = moduleIndex === 0 && index === 0;
      const unlocked = isFirstLessonOfCourse || (sequentialUnlocked && prerequisiteMet);

      let status: LessonStatus;
      if (!unlocked) {
        status = "locked";
      } else if (isCompleted) {
        status = "completed";
      } else if (isInProgress) {
        status = "in_progress";
      } else {
        status = "available";
      }

      computedLessons.push({ lesson, status });

      if (resumeLesson === null && (status === "available" || status === "in_progress")) {
        resumeLesson = { moduleId: currentModule.id, lesson };
      }

      if (isCompleted) {
        moduleCompletedCount += 1;
        totalCompleted += 1;
      }
      totalLessons += 1;

      previousLessonCompletedInModule = isCompleted;
    });

    const progressPercent =
      sortedLessons.length > 0 ? (moduleCompletedCount / sortedLessons.length) * 100 : 0;

    computedModules.push({
      module: currentModule,
      lessons: computedLessons,
      status: rollUpModuleStatus(computedLessons),
      progressPercent,
    });

    previousModuleCompleted = sortedLessons.length > 0 && moduleCompletedCount === sortedLessons.length;
  });

  const courseProgressPercent = totalLessons > 0 ? (totalCompleted / totalLessons) * 100 : 0;

  return { modules: computedModules, courseProgressPercent, resumeLesson };
}
