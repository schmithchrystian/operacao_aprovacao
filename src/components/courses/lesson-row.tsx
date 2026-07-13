import Link from "next/link";
import { cn, formatMinutesAsDuration } from "@/lib/utils";
import type { LessonSummaryDTO } from "@/contracts/courses";
import { LESSON_STATUS_LABEL, LessonStatusIcon } from "./lesson-status";

interface LessonRowProps {
  lesson: LessonSummaryDTO;
  href: string;
}

/**
 * Uma aula dentro da trilha de um módulo. Aulas `locked` não são links — renderizam um
 * `div[aria-disabled="true"]` com uma dica visível (não apenas em hover, para acessibilidade)
 * explicando que é preciso concluir a aula anterior. Demais status navegam para `href`
 * (a rota da aula em si é um placeholder até a Fase 7 — nenhuma regra de progresso aqui).
 */
export function LessonRow({ lesson, href }: LessonRowProps) {
  const isLocked = lesson.status === "locked";
  const isActive = lesson.status === "in_progress";

  const rowClassName = cn(
    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm",
    isActive && "bg-primary/5",
  );

  const title = (
    <p className={cn("truncate font-medium", isLocked ? "text-muted-foreground" : "text-foreground")}>
      <span className="text-muted-foreground mr-1.5">{lesson.order}.</span>
      {lesson.title}
    </p>
  );

  if (isLocked) {
    return (
      <li>
        <div aria-disabled="true" className={cn(rowClassName, "cursor-not-allowed opacity-70")}>
          <LessonStatusIcon status={lesson.status} />
          <div className="min-w-0 flex-1">
            {title}
            <p className="text-muted-foreground text-xs">Conclua a aula anterior para liberar esta aula.</p>
          </div>
          <span className="text-muted-foreground shrink-0 text-xs">
            {formatMinutesAsDuration(lesson.durationMinutes)}
          </span>
        </div>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={href}
        className={cn(
          rowClassName,
          "transition-colors hover:bg-muted focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
        )}
      >
        <LessonStatusIcon status={lesson.status} />
        <div className="min-w-0 flex-1">
          {title}
          <span className="sr-only"> — {LESSON_STATUS_LABEL[lesson.status]}</span>
        </div>
        <span className="text-muted-foreground shrink-0 text-xs">
          {formatMinutesAsDuration(lesson.durationMinutes)}
        </span>
      </Link>
    </li>
  );
}
