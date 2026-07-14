import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ErrorState } from "@/components/shared/error-state";
import { StudyPlanWorkspace } from "@/components/study-plan/study-plan-workspace";
import { listSubjectOptionsAction } from "@/server/actions/simulations";
import { getPlanAction } from "@/server/actions/study-plan";

export const metadata: Metadata = { title: "Plano de estudos" };

const BREADCRUMBS = [{ label: "Início", href: "/dashboard" }, { label: "Plano de estudos" }];

/**
 * "Plano de estudos" (Fase 11 — UI do agente `frontend`). Server Component: busca o plano ATIVO
 * do aluno (`getPlanAction` — `data: null` é um estado legítimo, "ainda não gerou plano", não um
 * erro) e a lista de matérias (só para popular os pesos do formulário de geração) e delega tudo
 * para `StudyPlanWorkspace`, que passa a possuir o estado no cliente para reordenar/marcar
 * concluído sem recarregar a página.
 *
 * Diferente de cursos/matérias em `/montar-estudo` (convenientes, mas não essenciais), uma falha
 * em `getPlanAction` aqui É um erro real — o plano é o dado principal da página — por isso vira
 * `ErrorState` em vez de silenciosamente cair no fluxo "sem plano".
 */
export default async function PlanoDeEstudosPage() {
  const [planResult, subjectsResult] = await Promise.all([getPlanAction(), listSubjectOptionsAction()]);

  if (!planResult.ok) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={BREADCRUMBS} />
        <ErrorState title="Não foi possível carregar seu plano de estudos" description={planResult.error.message} />
      </div>
    );
  }

  const subjects = subjectsResult.ok ? subjectsResult.data : [];

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs items={BREADCRUMBS} />
        <h1 className="text-2xl font-semibold tracking-tight">Plano de estudos</h1>
        <p className="text-muted-foreground text-sm">
          Organize sua reta final: gere um cronograma a partir da data da prova e acompanhe cada dia até lá.
        </p>
      </div>

      <StudyPlanWorkspace initialPlan={planResult.data} subjects={subjects} />
    </div>
  );
}
