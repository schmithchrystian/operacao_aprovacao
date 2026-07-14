import { STUDY_SESSION_BLOCK_LABELS, type StudySessionContentType } from "@/config/business";
import type { BuildSessionInput, ContentType, SessionContentRefDTO } from "@/contracts/study-session";
import { buildLessonHref } from "@/lib/routes";
import { getRepositories } from "@/server/repositories";
import { computeProgressForCourse } from "@/server/services/courses/shared";

/**
 * Resolução de conteúdo REAL dos mocks para um bloco de "Montar estudo" (Fase 11 — agente
 * `study-tracking`), quando possível — nunca lança; na ausência de conteúdo correspondente,
 * devolve um título genérico + `contentRef: null` ("quando possível... senão, bloco genérico").
 *
 * Cada tipo de conteúdo só tenta resolver contra os repositórios que já existem nesta fase:
 * - `videoaula`: próxima aula NÃO CONCLUÍDA e já liberada (reaproveita
 *   `computeProgressForCourse`, a mesma regra de liberação/progresso da Fase 6), respeitando
 *   `courseId`/`subjectId` quando informados;
 * - `questoes`/`simulado`: banco de questões / catálogo de simulados — só quando `subjectId`
 *   ou `topicId` é informado (um filtro totalmente vazio não identifica "conteúdo real" desta
 *   sessão especificamente, então nem tenta resolver);
 * - `pdf`/`flashcards`/`revisao`/`resumo`/`mapa_mental`: SEMPRE genérico — não existe
 *   repositório de material em PDF, flashcards ou repetição espaçada nesta fase (mesma classe
 *   de lacuna já documentada em `services/study-tracking/lesson-view.ts` sobre
 *   `LessonMaterial`; pendência registrada no relatório da Fase 11).
 *
 * `teacherId` (filtro "professor") é aceito no contrato mas NUNCA usado aqui — não existe
 * `TeacherRepository` nesta fase (mesma pendência).
 */
export interface ResolvedBlockContent {
  title: string;
  contentRef: SessionContentRefDTO | null;
}

type ContentFilters = Pick<BuildSessionInput, "courseId" | "subjectId" | "topicId" | "difficulty">;

export async function resolveBlockContent(
  userId: string,
  type: ContentType,
  filters: ContentFilters,
): Promise<ResolvedBlockContent> {
  const label = STUDY_SESSION_BLOCK_LABELS[type as StudySessionContentType];
  const repos = getRepositories();
  const subject = filters.subjectId ? await repos.subjects.findById(filters.subjectId) : null;
  const genericTitle = subject ? `${label} — ${subject.name}` : label;

  if (type === "videoaula") {
    const lessonRef = await findNextIncompleteLessonRef(userId, filters.courseId, filters.subjectId);
    return lessonRef ? { title: lessonRef.title, contentRef: lessonRef } : { title: genericTitle, contentRef: null };
  }

  if (type === "questoes" || type === "simulado") {
    if (!filters.subjectId && !filters.topicId) {
      return { title: genericTitle, contentRef: null };
    }
    const ref =
      type === "questoes"
        ? await findQuestionSetRef(filters.subjectId, filters.topicId, filters.difficulty, subject?.name ?? null)
        : await findMockExamRef(filters.subjectId, filters.topicId);
    return ref ? { title: ref.title, contentRef: ref } : { title: genericTitle, contentRef: null };
  }

  // pdf | flashcards | revisao | resumo | mapa_mental — sem repositório nesta fase.
  return { title: genericTitle, contentRef: null };
}

/** Resolve os cursos candidatos para busca de aula: o curso explícito, ou (na ausência dele)
 *  os cursos em que o aluno está ativamente matriculado — restritos à matéria quando informada. */
async function resolveCandidateCourseIds(
  userId: string,
  courseId: string | undefined,
  subjectId: string | undefined,
): Promise<string[]> {
  if (courseId) {
    return [courseId];
  }

  const repos = getRepositories();
  const enrollments = await repos.enrollments.listByUserId(userId);
  const activeCourseIds = enrollments.filter((e) => e.status !== "cancelled").map((e) => e.courseId);

  if (!subjectId) {
    return activeCourseIds;
  }

  const matching: string[] = [];
  for (const candidateCourseId of activeCourseIds) {
    const modules = await repos.modules.listByCourseId(candidateCourseId);
    if (modules.some((courseModule) => courseModule.subjectId === subjectId)) {
      matching.push(candidateCourseId);
    }
  }
  return matching;
}

async function findNextIncompleteLessonRef(
  userId: string,
  courseId: string | undefined,
  subjectId: string | undefined,
): Promise<SessionContentRefDTO | null> {
  const repos = getRepositories();
  const candidateCourseIds = await resolveCandidateCourseIds(userId, courseId, subjectId);

  for (const candidateCourseId of candidateCourseIds) {
    const course = await repos.courses.findById(candidateCourseId);
    if (!course) continue;

    const computed = await computeProgressForCourse(userId, candidateCourseId);
    const relevantModules = subjectId
      ? computed.modules.filter((entry) => entry.module.subjectId === subjectId)
      : computed.modules;
    const sortedModules = [...relevantModules].sort((a, b) => a.module.order - b.module.order);

    for (const moduleEntry of sortedModules) {
      const nextLesson = moduleEntry.lessons.find(
        (entry) => entry.status === "available" || entry.status === "in_progress",
      );
      if (nextLesson) {
        return {
          kind: "lesson",
          id: nextLesson.lesson.id,
          title: nextLesson.lesson.title,
          href: buildLessonHref({
            courseSlug: course.slug,
            moduleSlug: moduleEntry.module.slug,
            lessonId: nextLesson.lesson.id,
          }),
        };
      }
    }
  }

  return null;
}

async function findQuestionSetRef(
  subjectId: string | undefined,
  topicId: string | undefined,
  difficulty: BuildSessionInput["difficulty"],
  subjectName: string | null,
): Promise<SessionContentRefDTO | null> {
  const repos = getRepositories();
  const questions = await repos.questions.list({ subjectId, topicId, difficulty });
  if (questions.length === 0) {
    return null;
  }
  const suffix = subjectName ? ` — ${subjectName}` : "";
  return {
    kind: "question_set",
    // Não é uma entidade única — é um CONJUNTO filtrado; sem id próprio (schema permite `null`).
    id: null,
    title: `${questions.length} questões${suffix}`,
    href: null,
  };
}

async function findMockExamRef(
  subjectId: string | undefined,
  topicId: string | undefined,
): Promise<SessionContentRefDTO | null> {
  const repos = getRepositories();
  const exams = await repos.mockExams.list();

  for (const exam of exams) {
    const questions = await repos.questions.findByIds(exam.questionIds);
    const matches = questions.some(
      (question) =>
        (!subjectId || question.subjectId === subjectId) && (!topicId || question.topicId === topicId),
    );
    if (matches) {
      // Sem rota direta de "iniciar simulado" a partir de um link (exige chamar
      // `createAttemptAction` primeiro) — `href: null` é honesto aqui, não uma omissão.
      return { kind: "mock_exam", id: exam.id, title: exam.title, href: null };
    }
  }

  return null;
}
