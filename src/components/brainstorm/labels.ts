import {
  CalendarCheck,
  CheckCircle2,
  FileText,
  HelpCircle,
  Lightbulb,
  Sparkles,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import type { BrainstormCardPriority, BrainstormCardStatus, BrainstormCardType } from "@/contracts/brainstorm";

/**
 * Rótulos, ícones e variantes de exibição (pt-BR) do domínio "Brainstorm" (Fase 13 — UI do
 * agente `frontend`, CLAUDE.md §20). Puramente apresentacional — nenhuma regra de negócio, só
 * tradução de valores que já vêm prontos do backend (mesmo padrão de
 * `@/components/study-plan/labels`/`@/components/simulations/labels`).
 */

export const CARD_TYPE_LABEL: Record<BrainstormCardType, string> = {
  IDEIA: "Ideia",
  DUVIDA: "Dúvida",
  RESUMO: "Resumo",
  ANOTACAO: "Anotação",
};

export const CARD_TYPE_ICON: Record<BrainstormCardType, LucideIcon> = {
  IDEIA: Lightbulb,
  DUVIDA: HelpCircle,
  RESUMO: FileText,
  ANOTACAO: StickyNote,
};

/** Tons neutros/discretos — nenhum tipo de cartão é "erro" ou "sucesso" por si só (CLAUDE.md
 *  §21: amarelo só como destaque pontual, aqui reservado à "Ideia"). */
export const CARD_TYPE_BADGE_CLASS: Record<BrainstormCardType, string> = {
  IDEIA: "border-primary/40 bg-primary/10 text-primary",
  DUVIDA: "border-border bg-muted text-muted-foreground",
  RESUMO: "border-border bg-muted text-muted-foreground",
  ANOTACAO: "border-border bg-muted text-muted-foreground",
};

export const CARD_PRIORITY_LABEL: Record<BrainstormCardPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
};

/** Só `URGENT` usa vermelho (CLAUDE.md — "vermelho para erro e alerta"; urgência é um alerta
 *  legítimo). `LOW`/`MEDIUM` ficam neutros; `HIGH` usa o amarelo de destaque. Nenhuma prioridade
 *  usa verde (reservado a progresso/acerto, CLAUDE.md §21). */
export const CARD_PRIORITY_BADGE_CLASS: Record<BrainstormCardPriority, string> = {
  LOW: "border-border text-muted-foreground",
  MEDIUM: "border-border bg-muted text-foreground",
  HIGH: "border-primary/40 bg-primary/10 text-primary",
  URGENT: "border-destructive/40 bg-destructive/10 text-destructive",
};

export const CARD_STATUS_LABEL: Record<BrainstormCardStatus, string> = {
  OPEN: "Aberto",
  ARCHIVED: "Arquivado",
  CONVERTED: "Convertido",
};

/** Verde de conquista/progresso (CLAUDE.md §21) — usado no badge "Resolvido" do cartão. */
export const RESOLVED_BADGE_CLASS = "border-success/40 bg-success/10 text-success";
export const RESOLVED_ICON: LucideIcon = CheckCircle2;
export const FLASHCARD_CONVERSION_ICON: LucideIcon = Sparkles;
export const STUDY_TASK_CONVERSION_ICON: LucideIcon = CalendarCheck;
