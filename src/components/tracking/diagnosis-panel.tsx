import { AlertTriangle, CheckCircle2, Lightbulb, ListOrdered, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DiagnosisDTO } from "@/contracts/tracking";
import { DIAGNOSIS_RISK_BADGE_CLASS, DIAGNOSIS_RISK_ICON, DIAGNOSIS_RISK_LABEL } from "./labels";

interface DiagnosisPanelProps {
  diagnosis: DiagnosisDTO;
}

interface DiagnosisListProps {
  icon: LucideIcon;
  iconClassName?: string;
  title: string;
  items: string[];
  ordered?: boolean;
}

function DiagnosisList({ icon: Icon, iconClassName, title, items, ordered = false }: DiagnosisListProps) {
  const ListTag = ordered ? "ol" : "ul";

  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className={cn("h-4 w-4", iconClassName)} aria-hidden="true" />
        {title}
      </h3>
      <ListTag className={cn("space-y-1.5 text-sm", ordered ? "list-decimal pl-5" : "list-disc pl-5")}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ListTag>
    </div>
  );
}

/**
 * Bloco "Diagnóstico de preparação" (Fase 12 — UI): pontos fortes/fracos, prioridades, risco de
 * atraso e sugestões. Server Component puramente apresentacional — `DiagnosisDTO` já vem pronto
 * de `getDiagnosisAction` (`computeDiagnosis`, heurística pura do agente `study-tracking`);
 * nenhuma frase/classificação é gerada aqui.
 *
 * O risco de atraso nunca é comunicado só por cor: o badge sempre traz o texto
 * ("Risco baixo/médio/alto") junto da cor, mais o motivo (`delayRiskReason`) explicado pelo
 * backend logo ao lado — nunca cor isolada (acessibilidade a daltonismo).
 */
export function DiagnosisPanel({ diagnosis }: DiagnosisPanelProps) {
  const RiskIcon = DIAGNOSIS_RISK_ICON[diagnosis.delayRisk];

  return (
    <Card>
      <CardHeader className="gap-3">
        <CardTitle>Diagnóstico de preparação</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn("gap-1", DIAGNOSIS_RISK_BADGE_CLASS[diagnosis.delayRisk])}>
            <RiskIcon className="h-3 w-3" aria-hidden="true" />
            {DIAGNOSIS_RISK_LABEL[diagnosis.delayRisk]}
          </Badge>
          <span className="text-muted-foreground text-sm">{diagnosis.delayRiskReason}</span>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-2">
        <DiagnosisList
          icon={CheckCircle2}
          iconClassName="text-success"
          title="Pontos fortes"
          items={diagnosis.strengths}
        />
        <DiagnosisList
          icon={AlertTriangle}
          iconClassName="text-destructive"
          title="Pontos fracos"
          items={diagnosis.weaknesses}
        />
        <DiagnosisList
          icon={ListOrdered}
          iconClassName="text-primary"
          title="Prioridades"
          items={diagnosis.priorities}
          ordered
        />
        <DiagnosisList
          icon={Lightbulb}
          iconClassName="text-primary"
          title="Sugestões para a próxima semana"
          items={diagnosis.suggestions}
        />
      </CardContent>
    </Card>
  );
}
