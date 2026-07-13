import { CheckCircle2, Circle, Lock, PlayCircle, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LessonStatus } from "@/contracts/courses";

/**
 * Rótulos/ícones para `LessonStatus` (locked|available|in_progress|completed), reaproveitados
 * pelo status de aula e pelo rollup de status de módulo (mesma escala — `ModuleDTO.status`).
 * Apenas apresentação — a liberação sequencial em si já vem computada do backend (Fase 6).
 */
export const LESSON_STATUS_LABEL: Record<LessonStatus, string> = {
  locked: "Bloqueada",
  available: "Disponível",
  in_progress: "Em andamento",
  completed: "Concluída",
};

const STATUS_ICON: Record<LessonStatus, LucideIcon> = {
  locked: Lock,
  available: Circle,
  in_progress: PlayCircle,
  completed: CheckCircle2,
};

const STATUS_ICON_CLASS: Record<LessonStatus, string> = {
  locked: "text-muted-foreground",
  available: "text-muted-foreground",
  in_progress: "text-primary",
  completed: "text-success",
};

interface LessonStatusIconProps {
  status: LessonStatus;
  className?: string;
}

/** Ícone que representa visualmente o status de uma aula (ou o rollup de um módulo). */
export function LessonStatusIcon({ status, className }: LessonStatusIconProps) {
  const Icon = STATUS_ICON[status];
  return (
    <Icon className={cn("h-4 w-4 shrink-0", STATUS_ICON_CLASS[status], className)} aria-hidden="true" />
  );
}

const MODULE_BADGE_CLASS: Record<LessonStatus, string> = {
  locked: "border-border text-muted-foreground",
  available: "border-border text-foreground",
  in_progress: "border-primary/40 bg-primary/10 text-primary",
  completed: "border-success/40 bg-success/10 text-success",
};

/** Badge de status agregado de um módulo. */
export function ModuleStatusBadge({ status }: { status: LessonStatus }) {
  return (
    <Badge variant="outline" className={MODULE_BADGE_CLASS[status]}>
      {LESSON_STATUS_LABEL[status]}
    </Badge>
  );
}
