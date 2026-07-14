import { SIMULATIONS } from "@/config/business";
import type { MockExamConfigInput } from "@/contracts/simulations";
import { NotFoundError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import type { QuestionFilter } from "@/server/repositories/contracts/question-repository";
import { randomShuffle } from "./shuffle";

export interface ResolvedMockExam {
  mockExamId: string;
  timeLimitSeconds: number | null;
}

/**
 * Resolve o conjunto de matérias implicado por `contestId`/`courseId`/`subjectId`
 * (`Question` não tem FK direta para concurso/curso — docs/DATA-MODEL.md — então o filtro é
 * derivado via `Course`/`Module`, que já carregam `contestId`/`subjectId`). `undefined` = sem
 * filtro de matéria (todas elegíveis); array vazio = filtro válido mas sem nenhuma matéria
 * correspondente (o chamador deve tratar como "nenhuma questão encontrada").
 */
async function resolveSubjectIds(config: MockExamConfigInput): Promise<string[] | undefined> {
  const repos = getRepositories();

  if (config.subjectId) {
    return [config.subjectId];
  }

  if (config.courseId) {
    const modules = await repos.modules.listByCourseId(config.courseId);
    return [...new Set(modules.map((module) => module.subjectId))];
  }

  if (config.contestId) {
    const courses = await repos.courses.listByContestId(config.contestId);
    const modulesByCourse = await Promise.all(courses.map((course) => repos.modules.listByCourseId(course.id)));
    return [...new Set(modulesByCourse.flat().map((module) => module.subjectId))];
  }

  return undefined;
}

function buildCustomExamTitle(config: MockExamConfigInput): string {
  const parts: string[] = [];
  if (config.subjectId) parts.push("matéria selecionada");
  if (config.topicId) parts.push("assunto selecionado");
  if (config.board) parts.push(`banca ${config.board}`);
  if (config.difficulty) parts.push(`dificuldade ${config.difficulty}`);
  if (config.mode === "WRONG_ONLY") parts.push("questões erradas");
  if (config.mode === "NEW_ONLY") parts.push("questões novas");
  const suffix = parts.length > 0 ? ` — ${parts.join(", ")}` : "";
  return `Simulado personalizado${suffix}`;
}

/**
 * Resolve (usando um simulado de catálogo existente) ou CRIA (a partir de filtros) o
 * `MockExam` cujas questões serão usadas na tentativa. `MockExamAttempt.mockExamId` é
 * obrigatório no schema (docs/DATA-MODEL.md) — por isso mesmo um pool personalizado ad-hoc
 * precisa virar um `MockExam` (+ `MockExamQuestion`) próprio antes de existir uma tentativa.
 */
export async function resolveMockExamForConfig(
  userId: string,
  config: MockExamConfigInput,
): Promise<ResolvedMockExam> {
  const repos = getRepositories();

  if (config.mockExamId) {
    const exam = await repos.mockExams.findById(config.mockExamId);
    // Iniciar por `mockExamId` só aceita simulados de CATÁLOGO (publicados e não pessoais).
    // Simulados pessoais ad-hoc (`isPersonal`) são sempre montados na hora a partir de filtros —
    // nunca reiniciados por id — então rejeitá-los aqui impede que um aluno inicie uma tentativa
    // sobre o ad-hoc de OUTRO aluno adivinhando o id (achado de segurança Fase 10 — MÉDIO). Não
    // revela a existência do simulado alheio: mesma mensagem de "não encontrado".
    if (!exam || exam.isPersonal || exam.status !== "PUBLISHED") {
      throw new NotFoundError("Simulado não encontrado.");
    }
    if (exam.questionIds.length === 0) {
      throw new NotFoundError("Este simulado não possui questões.");
    }
    const timeLimitSeconds = (config.timeLimitMinutes ?? exam.durationMinutes) * 60;
    return { mockExamId: exam.id, timeLimitSeconds };
  }

  const subjectIds = await resolveSubjectIds(config);
  if (subjectIds && subjectIds.length === 0) {
    throw new NotFoundError("Nenhuma matéria encontrada para o filtro informado.");
  }

  const filter: QuestionFilter = {
    subjectIds,
    topicId: config.topicId,
    board: config.board,
    difficulty: config.difficulty,
  };

  let candidates = await repos.questions.list(filter);

  if (config.mode === "WRONG_ONLY" || config.mode === "NEW_ONLY") {
    const attempts = await repos.questionAttempts.listByUserId(userId);
    if (config.mode === "WRONG_ONLY") {
      const wrongIds = new Set(attempts.filter((a) => a.isCorrect === false).map((a) => a.questionId));
      candidates = candidates.filter((question) => wrongIds.has(question.id));
    } else {
      const attemptedIds = new Set(attempts.map((a) => a.questionId));
      candidates = candidates.filter((question) => !attemptedIds.has(question.id));
    }
  }

  if (candidates.length === 0) {
    throw new NotFoundError("Nenhuma questão encontrada para os filtros/modo selecionados.");
  }

  const selected = randomShuffle(candidates).slice(0, config.quantity);

  const durationMinutes =
    config.timeLimitMinutes ??
    Math.max(
      SIMULATIONS.customExamMinDurationMinutes,
      selected.length * SIMULATIONS.customExamMinutesPerQuestion,
    );

  const exam = await repos.mockExams.create({
    title: buildCustomExamTitle(config),
    description: "Simulado personalizado gerado a partir dos filtros selecionados pelo aluno.",
    durationMinutes,
    questionIds: selected.map((question) => question.id),
    // Dono do simulado pessoal = o próprio aluno (nunca descartado); o repositório marca o
    // registro como `isPersonal`/DRAFT para não vazar no catálogo (achado Fase 10 — MÉDIO).
    createdById: userId,
    now: new Date(),
  });

  const timeLimitSeconds = config.timeLimitMinutes ? config.timeLimitMinutes * 60 : null;
  return { mockExamId: exam.id, timeLimitSeconds };
}
