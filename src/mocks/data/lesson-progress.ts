import type { LessonProgressEntity } from "@/server/repositories/contracts/lesson-progress-repository";
import { mockModules, mockLessons } from "./modules";

/**
 * Mocks centralizados e tipados (ADR-0011, CLAUDE.md §23) — progresso de aula por aluno.
 *
 * FRONTEIRA DE DOMÍNIO: estes registros representam o resultado JÁ AVALIADO pelo agente
 * `study-tracking` (heartbeat/tempo válido, Fase 7/12) — aqui são só dados prontos para a
 * Fase 6 (cursos) derivar liberação sequencial e progresso agregado. Nenhum cálculo de
 * tempo assistido acontece neste módulo.
 *
 * Os ids de aula são resolvidos via `mockModules`/`mockLessons` (por curso/ordem) em vez de
 * hardcoded, para nunca divergir do catálogo real em `modules.ts`.
 */

function lessonIdAt(courseId: string, moduleOrder: number, lessonOrder: number): string {
  const targetModule = mockModules.find((m) => m.courseId === courseId && m.order === moduleOrder);
  if (!targetModule) {
    throw new Error(`[mocks/lesson-progress] Módulo não encontrado: ${courseId} #${moduleOrder}`);
  }
  const lesson = mockLessons.find((l) => l.moduleId === targetModule.id && l.order === lessonOrder);
  if (!lesson) {
    throw new Error(
      `[mocks/lesson-progress] Aula não encontrada: módulo ${targetModule.id} #${lessonOrder}`,
    );
  }
  return lesson.id;
}

function completed(userId: string, lessonId: string, at: string): LessonProgressEntity {
  return {
    id: `${userId}:${lessonId}`,
    userId,
    lessonId,
    status: "completed",
    watchedPercent: 1,
    completedAt: at,
    updatedAt: at,
  };
}

function inProgress(
  userId: string,
  lessonId: string,
  watchedPercent: number,
  at: string,
): LessonProgressEntity {
  return {
    id: `${userId}:${lessonId}`,
    userId,
    lessonId,
    status: "in_progress",
    watchedPercent,
    completedAt: null,
    updatedAt: at,
  };
}

/**
 * user-1 (course-1 — Polícia Militar): módulo 1 (Língua Portuguesa) concluído; módulo 2
 * (Raciocínio Lógico) com a 1ª aula concluída e a 2ª em andamento (35%) — ponto de
 * retomada esperado: "Lógica de argumentação".
 */
const user1Progress: LessonProgressEntity[] = [
  completed("user-1", lessonIdAt("course-1", 1, 1), "2026-06-18T12:00:00.000Z"),
  completed("user-1", lessonIdAt("course-1", 1, 2), "2026-06-19T12:00:00.000Z"),
  completed("user-1", lessonIdAt("course-1", 1, 3), "2026-06-20T12:00:00.000Z"),
  completed("user-1", lessonIdAt("course-1", 1, 4), "2026-06-21T12:00:00.000Z"),
  completed("user-1", lessonIdAt("course-1", 2, 1), "2026-07-01T09:00:00.000Z"),
  inProgress("user-1", lessonIdAt("course-1", 2, 2), 0.35, "2026-07-12T20:00:00.000Z"),
];

/**
 * user-2 (course-2 — Guarda Civil Municipal): módulos 1 e 2 concluídos; módulo 3
 * (Legislação Especial) com a 1ª aula ("Estatuto Geral das Guardas Municipais") em
 * andamento (60%) — ponto de retomada esperado nessa aula.
 */
const user2Progress: LessonProgressEntity[] = [
  completed("user-2", lessonIdAt("course-2", 1, 1), "2026-04-20T12:00:00.000Z"),
  completed("user-2", lessonIdAt("course-2", 1, 2), "2026-04-21T12:00:00.000Z"),
  completed("user-2", lessonIdAt("course-2", 1, 3), "2026-04-22T12:00:00.000Z"),
  completed("user-2", lessonIdAt("course-2", 1, 4), "2026-04-23T12:00:00.000Z"),
  completed("user-2", lessonIdAt("course-2", 2, 1), "2026-05-01T12:00:00.000Z"),
  completed("user-2", lessonIdAt("course-2", 2, 2), "2026-05-02T12:00:00.000Z"),
  completed("user-2", lessonIdAt("course-2", 2, 3), "2026-05-03T12:00:00.000Z"),
  completed("user-2", lessonIdAt("course-2", 2, 4), "2026-05-04T12:00:00.000Z"),
  inProgress("user-2", lessonIdAt("course-2", 3, 1), 0.6, "2026-07-11T08:00:00.000Z"),
];

/**
 * user-3 (course-1 — Polícia Militar): apenas a 1ª aula do curso em andamento (10%) —
 * ponto de retomada esperado: "Interpretação de texto" (1ª aula, sempre disponível).
 */
const user3Progress: LessonProgressEntity[] = [
  inProgress("user-3", lessonIdAt("course-1", 1, 1), 0.1, "2026-07-09T10:00:00.000Z"),
];

/**
 * user-4 (course-3 — Polícia Penal): módulos 1–5 100% concluídos; módulo 6 (Ética no
 * Serviço Público) com as 2 primeiras aulas concluídas e a 3ª ("Regime disciplinar") em
 * andamento (90%) — corrige a inconsistência da Fase 5 (próxima aula do dashboard
 * apontava para `course-2`/GCM enquanto o concurso selecionado era "contest-bombeiro",
 * sem curso correspondente no catálogo — ver `dashboard-contest.ts`/`dashboard-next-lesson.ts`).
 */
const user4Progress: LessonProgressEntity[] = [
  ...[1, 2, 3, 4, 5].flatMap((moduleOrder) =>
    [1, 2, 3, 4].map((lessonOrder) =>
      completed(
        "user-4",
        lessonIdAt("course-3", moduleOrder, lessonOrder),
        `2026-0${moduleOrder}-15T12:00:00.000Z`,
      ),
    ),
  ),
  completed("user-4", lessonIdAt("course-3", 6, 1), "2026-06-20T12:00:00.000Z"),
  completed("user-4", lessonIdAt("course-3", 6, 2), "2026-06-25T12:00:00.000Z"),
  inProgress("user-4", lessonIdAt("course-3", 6, 3), 0.9, "2026-07-12T20:00:00.000Z"),
];

export const mockLessonProgress: LessonProgressEntity[] = [
  ...user1Progress,
  ...user2Progress,
  ...user3Progress,
  ...user4Progress,
];
