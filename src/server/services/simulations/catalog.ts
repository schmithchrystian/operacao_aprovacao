import type { MockExamCatalogItemDTO, SubjectOptionDTO, TopicOptionDTO } from "@/contracts/simulations";
import { getRepositories } from "@/server/repositories";

/**
 * Leituras de catálogo (Fase 10 — UI do agente `frontend`) para popular os filtros/listas do
 * formulário de montagem de simulado (`MockExamBuilderForm`). Nenhuma regra de negócio aqui —
 * só projeta entidades já lidas em outros pontos do domínio (`repos.mockExams`/`repos.subjects`/
 * `repos.topics`, os mesmos usados por `question-pool.ts`/`mappers.ts`) no formato de opção que
 * o frontend precisa. Dado público de catálogo, sem vínculo com um usuário (sem
 * `assertOwnership`) — mesmo padrão de `listCourses` (`@/server/services/courses/list-courses.ts`).
 */

/** Simulados de catálogo publicados — para "simulado completo"/"por matéria" pré-montados. */
export async function listMockExamCatalog(): Promise<MockExamCatalogItemDTO[]> {
  const repos = getRepositories();
  const exams = await repos.mockExams.list();

  return exams.map((exam) => ({
    id: exam.id,
    title: exam.title,
    description: exam.description,
    durationMinutes: exam.durationMinutes,
    questionCount: exam.questionIds.length,
  }));
}

/** Todas as matérias, para o filtro "matéria" do simulado personalizado. */
export async function listSubjectOptions(): Promise<SubjectOptionDTO[]> {
  const repos = getRepositories();
  const subjects = await repos.subjects.list();
  return [...subjects].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

/** Assuntos de uma matéria específica, para o filtro "assunto" (dependente da matéria). */
export async function listTopicOptions(subjectId: string): Promise<TopicOptionDTO[]> {
  const repos = getRepositories();
  const topics = await repos.topics.listBySubjectId(subjectId);
  return [...topics].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}
