import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { StudySessionBuilderForm } from "@/components/study-session/study-session-builder-form";
import { listCoursesAction } from "@/server/actions/courses";
import { listSubjectOptionsAction } from "@/server/actions/simulations";

export const metadata: Metadata = { title: "Montar estudo" };

const BREADCRUMBS = [{ label: "Início", href: "/dashboard" }, { label: "Montar estudo" }];

/**
 * "Montar estudo" (Fase 11 — UI do agente `frontend`). Server Component: busca cursos/matérias
 * só para popular os selects de filtro do formulário (dado público de catálogo, sem cálculo de
 * negócio aqui) e delega a montagem em si para `StudySessionBuilderForm`
 * (`buildSessionAction`/`startStudyMissionAction`, ambos do agente `study-tracking`). Concurso é
 * derivado dos cursos (mesmo padrão de `/simulados`) — não há uma listagem de concursos própria.
 *
 * Cursos/matérias são só CONVENIÊNCIA de filtro (todos os campos são opcionais no contrato) —
 * se a busca falhar, o formulário segue funcional com selects vazios em vez de quebrar a página.
 */
export default async function MontarEstudoPage() {
  const [coursesResult, subjectsResult] = await Promise.all([listCoursesAction(), listSubjectOptionsAction()]);

  const courses = coursesResult.ok ? coursesResult.data : [];
  const contests = Array.from(new Map(courses.map((course) => [course.contestId, course.contestName])).entries()).map(
    ([id, name]) => ({ id, name }),
  );
  const courseOptions = courses.map((course) => ({ id: course.id, title: course.title, contestId: course.contestId }));
  const subjects = subjectsResult.ok ? subjectsResult.data : [];

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs items={BREADCRUMBS} />
        <h1 className="text-2xl font-semibold tracking-tight">Montar estudo</h1>
        <p className="text-muted-foreground text-sm">
          Escolha o tempo que você tem agora e monte uma sessão sob medida: videoaula, questões, flashcards,
          revisão e mais — na ordem certa para aproveitar melhor.
        </p>
      </div>

      <StudySessionBuilderForm contests={contests} courses={courseOptions} subjects={subjects} />
    </div>
  );
}
