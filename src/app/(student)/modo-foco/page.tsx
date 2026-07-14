import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { FocusWorkspace } from "@/components/focus/focus-workspace";
import { listSubjectOptionsAction } from "@/server/actions/simulations";

export const metadata: Metadata = { title: "Modo foco" };

const BREADCRUMBS = [{ label: "Início", href: "/dashboard" }, { label: "Modo foco" }];

/**
 * Modo Foco / Pomodoro (Fase 15 — UI do agente `frontend`). Server Component: busca só as
 * matérias (`listSubjectOptionsAction`, mesmo dado de catálogo público usado por
 * `/montar-estudo`) para popular o select opcional "Matéria" do formulário de início — uma falha
 * aqui degrada silenciosamente para uma lista vazia (o Modo Foco continua funcional sem matéria
 * selecionada), mesmo padrão de `MontarEstudoPage`.
 *
 * Toda a interação real (selecionar modo, iniciar, heartbeat, pausar/retomar, encerrar) vive em
 * `FocusWorkspace` — o único Client Component desta tela.
 */
export default async function ModoFocoPage() {
  const subjectsResult = await listSubjectOptionsAction();
  const subjects = subjectsResult.ok ? subjectsResult.data : [];

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs items={BREADCRUMBS} />
        <h1 className="text-2xl font-semibold tracking-tight">Modo foco</h1>
        <p className="text-muted-foreground text-sm">
          Escolha um modo Pomodoro, defina seu objetivo e mantenha o foco — o tempo válido e a pontuação são
          sempre conferidos pelo servidor a partir da sua atividade real durante a sessão.
        </p>
      </div>

      <FocusWorkspace subjects={subjects} />
    </div>
  );
}
