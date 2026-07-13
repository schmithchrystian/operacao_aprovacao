import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock, GraduationCap } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { ModuleSection } from "@/components/courses/module-section";
import { ErrorState } from "@/components/shared/error-state";
import { ProgressBar } from "@/components/shared/progress-bar";
import { LessonPlayer } from "@/components/lessons/lesson-player";
import { LessonNotes } from "@/components/lessons/lesson-notes";
import { formatMinutesAsDuration } from "@/lib/utils";
import { getCourseDetailAction } from "@/server/actions/courses";
import { getLessonViewAction } from "@/server/actions/progress";

export const metadata: Metadata = { title: "Aula" };

interface LessonPageProps {
  params: Promise<{ slug: string; moduleSlug: string; lessonId: string }>;
}

/**
 * Página da aula (Fase 7 — player + heartbeat + "Vitória conquistada"). Server Component:
 * busca `LessonViewDTO` (player, materiais, navegação, progresso) e `CourseDetailDTO`
 * (trilha completa, para a lista lateral de módulos/aulas) já prontos do servidor — nenhuma
 * regra de liberação/progresso/tempo válido é decidida aqui, só exibida. O único trecho
 * interativo (player, heartbeat, diálogo de vitória) fica isolado em `LessonPlayer`
 * (Client Component).
 */
export default async function LessonPage({ params }: LessonPageProps) {
  const { slug, moduleSlug, lessonId } = await params;

  const [lessonResult, courseResult] = await Promise.all([
    getLessonViewAction({ courseSlug: slug, moduleSlug, lessonId }),
    getCourseDetailAction({ slug }),
  ]);

  if (!lessonResult.ok) {
    if (lessonResult.error.code === "NOT_FOUND") {
      notFound();
    }

    return (
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: "Início", href: "/dashboard" },
            { label: "Cursos", href: "/cursos" },
            { label: "Curso", href: `/cursos/${slug}` },
            { label: "Aula" },
          ]}
        />
        <ErrorState title="Não foi possível carregar a aula" description={lessonResult.error.message} />
      </div>
    );
  }

  const lesson = lessonResult.data;
  const courseTrackHref = `/cursos/${slug}`;

  // A trilha completa (módulos/aulas com status) é só um complemento visual (sidebar) —
  // se falhar, a aula em si já foi carregada com sucesso acima, então não bloqueamos a
  // página por causa dela.
  const course = courseResult.ok ? courseResult.data : null;
  const currentModule = course?.modules.find((candidate) => candidate.slug === moduleSlug) ?? null;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Início", href: "/dashboard" },
          { label: "Cursos", href: "/cursos" },
          { label: course?.course.title ?? "Curso", href: courseTrackHref },
          ...(currentModule ? [{ label: currentModule.title }] : []),
          { label: lesson.title },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{lesson.title}</h1>
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4" aria-hidden="true" />
                {lesson.teacherName}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" aria-hidden="true" />
                {formatMinutesAsDuration(lesson.durationMinutes)}
              </span>
            </div>
          </div>

          <LessonPlayer
            lessonId={lesson.lessonId}
            videoUrl={lesson.videoUrl}
            resumePositionSeconds={lesson.resumePositionSeconds}
            initialWatchedPercent={lesson.watchedPercent}
            initialStatus={lesson.status}
            nextLessonHref={lesson.nextLesson?.href ?? null}
            nextLessonTitle={lesson.nextLesson?.title ?? null}
            courseTrackHref={courseTrackHref}
          />

          {lesson.description ? <p className="text-muted-foreground text-sm">{lesson.description}</p> : null}

          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Materiais de apoio</h2>
            {lesson.materials.length > 0 ? (
              <ul className="space-y-1.5">
                {lesson.materials.map((material) => (
                  <li key={material.id}>
                    <a
                      href={material.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-sm underline-offset-4 hover:underline"
                    >
                      {material.title}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">Nenhum material disponível para esta aula.</p>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {lesson.previousLesson ? (
              <Button variant="outline" render={<Link href={lesson.previousLesson.href} />}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Aula anterior
              </Button>
            ) : (
              <span />
            )}
            {lesson.nextLesson ? (
              <Button variant="outline" render={<Link href={lesson.nextLesson.href} />}>
                Próxima aula
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : null}
          </div>

          <LessonNotes lessonId={lesson.lessonId} />
        </div>

        <aside className="space-y-4">
          <Button variant="outline" className="w-full" render={<Link href={courseTrackHref} />}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar à trilha
          </Button>

          <div className="border-border bg-card space-y-3 rounded-lg border p-4">
            <ProgressBar value={lesson.moduleProgressPercent} label="Progresso do módulo" variant="success" />
            <ProgressBar value={lesson.courseProgressPercent} label="Progresso do curso" variant="success" />
          </div>

          {course ? (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold">Módulos do curso</h2>
              <div className="space-y-3">
                {course.modules.map((module) => (
                  <ModuleSection
                    key={module.id}
                    module={module}
                    courseSlug={slug}
                    defaultOpen={module.slug === moduleSlug}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
