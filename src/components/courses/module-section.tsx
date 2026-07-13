import { ChevronRight } from "lucide-react";
import { ProgressBar } from "@/components/shared/progress-bar";
import { buildLessonHref } from "@/lib/routes";
import type { ModuleDTO } from "@/contracts/courses";
import { LessonRow } from "./lesson-row";
import { ModuleStatusBadge } from "./lesson-status";

interface ModuleSectionProps {
  module: ModuleDTO;
  courseSlug: string;
  defaultOpen?: boolean;
}

/**
 * Seção de um módulo na trilha do curso: usa `<details>/<summary>` nativo (Server Component,
 * sem JavaScript de cliente) para expandir/recolher — o navegador já cuida do estado, do
 * teclado (Enter/Espaço) e do papel semântico de "disclosure widget".
 */
export function ModuleSection({ module, courseSlug, defaultOpen = false }: ModuleSectionProps) {
  return (
    <details className="group border-border bg-card overflow-hidden rounded-lg border" open={defaultOpen}>
      <summary className="focus-visible:ring-ring flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 select-none focus-visible:ring-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-3">
          <ChevronRight
            className="text-muted-foreground h-4 w-4 shrink-0 transition-transform group-open:rotate-90"
            aria-hidden="true"
          />
          <span className="truncate text-sm font-semibold">
            {module.order}. {module.title}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <ModuleStatusBadge status={module.status} />
          <span className="text-muted-foreground w-9 text-right text-xs tabular-nums">
            {Math.round(module.progressPercent)}%
          </span>
        </span>
      </summary>
      <div className="border-border border-t px-3 py-3">
        <ProgressBar
          value={module.progressPercent}
          showValue={false}
          variant="success"
          className="mb-3 px-1"
        />
        <ul className="space-y-0.5">
          {module.lessons.map((lesson) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              href={buildLessonHref({ courseSlug, moduleSlug: module.slug, lessonId: lesson.id })}
            />
          ))}
        </ul>
      </div>
    </details>
  );
}
