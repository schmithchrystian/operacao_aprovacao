import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ContentStatusInput } from "@/contracts/admin-content";

const STATUS_LABEL: Record<ContentStatusInput, string> = {
  DRAFT: "Rascunho",
  PUBLISHED: "Publicado",
  ARCHIVED: "Arquivado",
};

/** Verde para publicado (CLAUDE.md §21 — verde = progresso/publicado), vermelho para
 *  arquivado/oculto, neutro para rascunho. Nunca só cor: o texto do rótulo já diferencia. */
const STATUS_CLASS: Record<ContentStatusInput, string> = {
  DRAFT: "",
  PUBLISHED: "bg-success/10 text-success border-success/20",
  ARCHIVED: "bg-destructive/10 text-destructive border-destructive/20",
};

interface ContentStatusBadgeProps {
  status: ContentStatusInput;
  className?: string;
}

/** Badge de status de conteúdo (Curso/Módulo/Aula/Questão/Simulado) — mesmos 3 estados
 *  (`contentStatusSchema`) reaproveitados por todas as telas de gestão de conteúdo. */
export function ContentStatusBadge({ status, className }: ContentStatusBadgeProps) {
  return (
    <Badge variant={status === "DRAFT" ? "outline" : "secondary"} className={cn(STATUS_CLASS[status], className)}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
