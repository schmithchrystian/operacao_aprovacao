"use client";

import { useState } from "react";
import type { SubjectOptionDTO } from "@/contracts/simulations";
import type { StudyPlanDTO } from "@/contracts/study-plan";
import { GeneratePlanForm } from "./generate-plan-form";
import { StudyPlanCalendar } from "./study-plan-calendar";

interface StudyPlanWorkspaceProps {
  initialPlan: StudyPlanDTO | null;
  subjects: SubjectOptionDTO[];
}

/**
 * Orquestrador client-side de "Plano de estudos" (Fase 11 — UI do agente `frontend`). Recebe o
 * `StudyPlanDTO` inicial já resolvido pelo Server Component (`getPlanAction`, `null` quando o
 * aluno ainda não gerou nenhum plano) e passa a possuir esse estado no cliente — evita um
 * `router.refresh()` a cada mutação: `generatePlanAction`/reordenar/marcar concluído todos
 * devolvem o `StudyPlanDTO` atualizado, que substitui `plan` diretamente (mesmo padrão de
 * "cliente dono do estado inicializado pelo servidor" de `FavoriteToggleButton`).
 *
 * Alterna entre o formulário de geração e o calendário: sem plano -> formulário; com plano ->
 * calendário (com a opção "Gerar novo plano" voltando ao formulário a qualquer momento, já que
 * `generatePlanAction` sempre pode REGENERAR o plano ativo).
 */
export function StudyPlanWorkspace({ initialPlan, subjects }: StudyPlanWorkspaceProps) {
  const [plan, setPlan] = useState<StudyPlanDTO | null>(initialPlan);
  const [showGenerateForm, setShowGenerateForm] = useState(initialPlan === null);

  if (!plan || showGenerateForm) {
    return (
      <div className="space-y-4">
        {plan ? (
          <button
            type="button"
            onClick={() => setShowGenerateForm(false)}
            className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4"
          >
            Voltar para o calendário
          </button>
        ) : null}
        <GeneratePlanForm
          subjects={subjects}
          onGenerated={(generatedPlan) => {
            setPlan(generatedPlan);
            setShowGenerateForm(false);
          }}
        />
      </div>
    );
  }

  return (
    <StudyPlanCalendar
      plan={plan}
      onPlanUpdated={setPlan}
      onRequestRegenerate={() => setShowGenerateForm(true)}
    />
  );
}
