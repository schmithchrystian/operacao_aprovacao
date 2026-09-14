import type { Metadata } from "next";
import Link from "next/link";
import { Route } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ModuleSection } from "@/components/courses/module-section";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { listCoursesAction, getCourseDetailAction } from "@/server/actions/courses";
export const metadata: Metadata = { title: "Minha trilha" };
export default async function TrilhaPage() {
  const result = await listCoursesAction();
  const courses = result.ok ? result.data.filter(course => course.enrolled) : [];
  const details = await Promise.all(courses.map(async course => ({ course, detail: await getCourseDetailAction({ slug: course.slug }) })));
  return <div className="space-y-6">
    <Breadcrumbs items={[{ label: "Início", href: "/dashboard" }, { label: "Minha trilha" }]} />
    <h1 className="text-2xl font-semibold tracking-tight">Minha trilha</h1>
    <p className="text-muted-foreground">Acompanhe seus cursos, módulos e próximas aulas.</p>
    <Link href="/missoes" className="text-primary inline-block underline">Minhas missões de estudo</Link>
    {!result.ok ? <ErrorState title="Não foi possível carregar sua trilha" description={result.error.message} />
      : courses.length === 0 ? <><EmptyState icon={Route} title="Sua trilha começa com um curso" description="Matricule-se em um curso para acompanhar seu progresso aqui." /><Link className="text-primary underline" href="/cursos">Explorar cursos</Link></>
      : details.map(({ course, detail }) => <section key={course.id} className="space-y-3" aria-label={course.title}>
        <h2 className="text-xl font-semibold"><Link href={`/cursos/${encodeURIComponent(course.slug)}`}>{course.title}</Link></h2>
        {!detail.ok ? <ErrorState title="Curso indisponível" description={detail.error.message} /> : <>
          <p className="text-muted-foreground text-sm">{Math.round(detail.data.course.progressPercent)}% concluído</p>
          {detail.data.nextLesson ? <Link className="text-primary inline-block underline" href={detail.data.nextLesson.href}>Continuar: {detail.data.nextLesson.lessonTitle}</Link> : <p>Você concluiu as aulas disponíveis.</p>}
          {detail.data.modules.length ? detail.data.modules.map((courseModule, index) => <ModuleSection key={courseModule.id} module={courseModule} courseSlug={course.slug} defaultOpen={index === 0} />) : <p>Nenhum módulo publicado neste curso.</p>}
        </>}
      </section>)}
  </div>;
}
