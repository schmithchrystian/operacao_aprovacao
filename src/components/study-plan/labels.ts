import {
  CheckCircle2,
  Circle,
  CircleDot,
  ClipboardCheck,
  GraduationCap,
  RotateCcw,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { StudyPlanItemKind, StudyPlanItemStatus } from "@/contracts/study-plan";

/**
 * Rótulos, ícones e variantes de exibição (pt-BR) do "Plano de estudos" (Fase 11). Puramente
 * apresentacional — nenhuma regra de negócio, só tradução de valores que já vêm prontos do
 * backend (mesmo padrão de `@/components/simulations/labels`).
 *
 * Cores seguem a identidade visual do projeto (CLAUDE.md): verde só para conclusão/progresso,
 * vermelho reservado para erro/alerta (nunca usado aqui — "pulado" não é um erro), amarelo
 * (`default`/primary) usado com moderação só para o tipo menos frequente (simulado).
 */

export const PLAN_ITEM_KIND_LABEL: Record<StudyPlanItemKind, string> = {
  STUDY: "Estudo",
  REVIEW: "Revisão",
  MOCK_EXAM: "Simulado",
  CUSTOM: "Personalizado",
};

export const PLAN_ITEM_KIND_ICON: Record<StudyPlanItemKind, LucideIcon> = {
  STUDY: GraduationCap,
  REVIEW: RotateCcw,
  MOCK_EXAM: ClipboardCheck,
  CUSTOM: Sparkles,
};

export const PLAN_ITEM_KIND_BADGE_VARIANT: Record<
  StudyPlanItemKind,
  "outline" | "secondary" | "default"
> = {
  STUDY: "outline",
  REVIEW: "secondary",
  MOCK_EXAM: "default",
  CUSTOM: "outline",
};

export const PLAN_ITEM_STATUS_LABEL: Record<StudyPlanItemStatus, string> = {
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  DONE: "Concluído",
  SKIPPED: "Pulado",
};

export const PLAN_ITEM_STATUS_ICON: Record<StudyPlanItemStatus, LucideIcon> = {
  PENDING: Circle,
  IN_PROGRESS: CircleDot,
  DONE: CheckCircle2,
  SKIPPED: Circle,
};

export const PLAN_ITEM_STATUS_BADGE_CLASS: Record<StudyPlanItemStatus, string> = {
  PENDING: "border-border text-muted-foreground",
  IN_PROGRESS: "border-primary/40 bg-primary/10 text-primary",
  DONE: "border-success/40 bg-success/10 text-success",
  SKIPPED: "border-border text-muted-foreground line-through decoration-muted-foreground/60",
};
