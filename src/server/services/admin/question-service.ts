import type { AdminQuestionDTO, CreateQuestionInput, UpdateQuestionInput } from "@/contracts/admin-content";
import { withAdminAudit } from "@/server/audit/with-admin-audit";
import { NotFoundError, ValidationError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import { toAdminQuestionDTO } from "./mappers";
import { CONTENT_DELETE_ROLES, CONTENT_MANAGE_ROLES } from "./roles";

/** CRUD administrativo de Questões (Fase 17 — caminho vertical priorizado). */

async function assertSubjectAndTopic(subjectId: string, topicId: string | null | undefined): Promise<void> {
  const repos = getRepositories();
  const subject = await repos.subjects.findById(subjectId);
  if (!subject || subject.deletedAt !== null) {
    throw new ValidationError("Matéria informada não existe.", { subjectId: ["Matéria inválida."] });
  }
  if (topicId) {
    const topic = await repos.topics.findById(topicId);
    if (!topic || topic.deletedAt !== null || topic.subjectId !== subjectId) {
      throw new ValidationError("Assunto informado inválido para a matéria.", {
        topicId: ["Assunto inválido para a matéria selecionada."],
      });
    }
  }
}

/** Defesa em profundidade (mesmo espírito de `reorderPlanItems`): o contrato Zod já garante
 *  exatamente 1 alternativa correta, mas o serviço pode ser chamado direto (ex.: testes). */
function assertExactlyOneCorrectOption(options: { isCorrect: boolean }[]): void {
  const correctCount = options.filter((option) => option.isCorrect).length;
  if (correctCount !== 1) {
    throw new ValidationError("A questão deve ter exatamente uma alternativa correta.", {
      options: ["Marque exatamente uma alternativa como correta."],
    });
  }
}

export const listQuestionsForAdmin = withAdminAudit(
  { operation: "admin.questions.list", entity: "Question", roles: [...CONTENT_MANAGE_ROLES] },
  async (): Promise<AdminQuestionDTO[]> => {
    const repos = getRepositories();
    const questions = await repos.questions.listForAdmin();
    const options = await repos.questionOptions.listByQuestionIds(questions.map((question) => question.id));
    const optionsByQuestion = new Map<string, typeof options>();
    for (const option of options) {
      const list = optionsByQuestion.get(option.questionId) ?? [];
      list.push(option);
      optionsByQuestion.set(option.questionId, list);
    }
    return questions.map((question) => toAdminQuestionDTO(question, optionsByQuestion.get(question.id) ?? []));
  },
);

export const createQuestionForAdmin = withAdminAudit(
  { operation: "admin.questions.create", entity: "Question", roles: [...CONTENT_MANAGE_ROLES] },
  async (_session, input: CreateQuestionInput, now: Date): Promise<AdminQuestionDTO> => {
    assertExactlyOneCorrectOption(input.options);
    await assertSubjectAndTopic(input.subjectId, input.topicId);

    const repos = getRepositories();
    const created = await repos.questions.create({
      statement: input.statement,
      subjectId: input.subjectId,
      topicId: input.topicId ?? null,
      board: input.board ?? null,
      difficulty: input.difficulty,
      explanation: input.explanation ?? null,
      now,
    });
    const options = await repos.questionOptions.replaceForQuestion(created.id, input.options);
    return toAdminQuestionDTO(created, options);
  },
);

export const updateQuestionForAdmin = withAdminAudit(
  { operation: "admin.questions.update", entity: "Question", roles: [...CONTENT_MANAGE_ROLES] },
  async (_session, input: UpdateQuestionInput, now: Date): Promise<AdminQuestionDTO> => {
    const repos = getRepositories();
    const current = await repos.questions.findById(input.id);
    if (!current) {
      throw new NotFoundError("Questão não encontrada.");
    }

    if (input.options) {
      assertExactlyOneCorrectOption(input.options);
    }
    if (input.subjectId !== undefined || input.topicId !== undefined) {
      await assertSubjectAndTopic(input.subjectId ?? current.subjectId, input.topicId ?? current.topicId);
    }

    const updated = await repos.questions.update({
      id: input.id,
      statement: input.statement,
      subjectId: input.subjectId,
      topicId: input.topicId,
      board: input.board,
      difficulty: input.difficulty,
      explanation: input.explanation,
      status: input.status,
      now,
    });

    const options = input.options
      ? await repos.questionOptions.replaceForQuestion(updated.id, input.options)
      : await repos.questionOptions.listByQuestionId(updated.id);

    return toAdminQuestionDTO(updated, options);
  },
  (input) => input.id,
);

export const archiveQuestionForAdmin = withAdminAudit(
  { operation: "admin.questions.archive", entity: "Question", roles: [...CONTENT_DELETE_ROLES] },
  async (_session, id: string, now: Date): Promise<AdminQuestionDTO> => {
    const repos = getRepositories();
    const current = await repos.questions.findById(id);
    if (!current) {
      throw new NotFoundError("Questão não encontrada.");
    }
    const archived = await repos.questions.softDelete(id, now);
    const options = await repos.questionOptions.listByQuestionId(id);
    return toAdminQuestionDTO(archived, options);
  },
  (id) => id,
);
