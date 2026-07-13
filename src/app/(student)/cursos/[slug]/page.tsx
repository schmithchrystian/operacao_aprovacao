import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock, GraduationCap, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { EnrollButton } from "@/components/courses/enroll-button";
import { ModuleSection } from "@/components/courses/module-section";
import { ErrorState } from "@/components/shared/error-state";
import { ProgressBar } from "@/components/shared/progress-bar";
import type { CourseDifficulty } from "@/contracts/courses";
import { getCourseDetailAction } from "@/server/actions/courses";

export const metadata: Metadata = { title: "Curso" };

const DIFFICULTY_LABEL: Record<CourseDifficulty, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

interface CoursePageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Trilha do curso (Fase 6): módulos → aulas em ordem cronológica, com status de liberação
 * já computado pelo backend (`getCourseDetailAction`). Server Component — nenhuma regra de
 * negócio (liberação sequencial, progresso, tempo válido) é decidida aqui, apenas exibida.
 */
export default async function CoursePage({ params }: CoursePageProps) {
  const { slug } = await params;
  const result = await getCourseDetailAction({ slug });

  if (!result.ok) {
    if (result.error.code === "NOT_FOUND") {
      notFound();
    }

    return (
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: "Início", href: "/dashboard" },
            { label: "Cursos", href: "/cursos" },
            { label: "Curso" },
          ]}
        />
        <ErrorState title="Não foi possível carregar o curso" description={result.error.message} />
      </div>
    );
  }

  const { course, modules, nextLesson } = result.data;
  const defaultOpenModuleId = nextLesson?.moduleId ?? modules[0]?.id;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Início", href: "/dashboard" },
          { label: "Cursos", href: "/cursos" },
          { label: course.title },
        ]}
      />

      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {course.contestName}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">{course.title}</h1>
            <p className="text-muted-foreground max-w-2xl text-sm">{course.description}</p>
          </div>
          {!course.enrolled ? <EnrollButton courseId={course.id} /> : null}
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="flex items-center gap-1.5">
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
            {course.teacherName}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" aria-hidden="true" />
            {course.workloadHours}h
          </span>
          <Badge variant="outline">{DIFFICULTY_LABEL[course.difficulty]}</Badge>
        </div>

        {course.subjects.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {course.subjects.map((subject) => (
              <Badge key={subject} variant="secondary">
                {subject}
              </Badge>
            ))}
          </div>
        ) : null}

        {course.enrolled ? (
          <div className="space-y-3">
            <ProgressBar
              value={course.progressPercent}
              label="Progresso no curso"
              variant={course.status === "concluido" ? "success" : "default"}
            />
            {nextLesson ? (
              <Button render={<Link href={nextLesson.href} />}>
                Continuar de onde parou
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : (
              <Badge variant="outline" className="border-success/40 bg-success/10 text-success gap-1">
                <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                Curso concluído
              </Badge>
            )}
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Módulos</h2>
        <div className="space-y-3">
          {modules.map((module) => (
            <ModuleSection
              key={module.id}
              module={module}
              courseSlug={course.slug}
              defaultOpen={module.id === defaultOpenModuleId}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
