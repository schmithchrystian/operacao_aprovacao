import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ErrorState } from "@/components/shared/error-state";
import { ModulesManager } from "@/components/admin/cursos/modules-manager";
import { listCoursesForAdminAction } from "@/server/actions/admin/courses";
import { listModulesForAdminAction } from "@/server/actions/admin/modules";
import { listSubjectsForAdminAction } from "@/server/actions/admin/subjects";
import { listTeachersForAdminAction } from "@/server/actions/admin/teachers";
import { getCurrentSession } from "@/server/authorization";

export const metadata: Metadata = {
  title: "Módulos do curso",
};

interface AdminCourseDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Detalhe de um curso: módulos e aulas (Fase 17 — item 3, caminho vertical
 * Curso → Módulo → Aula). Não existe `getCourseByIdForAdmin` dedicado ainda — o curso é
 * localizado dentro da listagem completa (`listCoursesForAdminAction`), mesma fonte usada por
 * `/admin/cursos` (sem duplicar regra de negócio, só um filtro de apresentação).
 */
export default async function AdminCourseDetailPage({ params }: AdminCourseDetailPageProps) {
  const { id } = await params;

  const [coursesResult, modulesResult, subjectsResult, teachersResult, session] = await Promise.all([
    listCoursesForAdminAction(),
    listModulesForAdminAction({ courseId: id }),
    listSubjectsForAdminAction(),
    listTeachersForAdminAction(),
    getCurrentSession(),
  ]);

  if (!coursesResult.ok) {
    return <ErrorState title="Não foi possível carregar o curso" description={coursesResult.error.message} />;
  }

  const course = coursesResult.data.find((item) => item.id === id);
  if (!course) notFound();

  if (!modulesResult.ok) {
    return <ErrorState title="Não foi possível carregar os módulos" description={modulesResult.error.message} />;
  }
  if (!subjectsResult.ok) {
    return <ErrorState title="Não foi possível carregar as matérias" description={subjectsResult.error.message} />;
  }
  if (!teachersResult.ok) {
    return <ErrorState title="Não foi possível carregar os professores" description={teachersResult.error.message} />;
  }

  return (
    <div className="space-y-4">
      <Link
        href="/admin/cursos"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm underline-offset-4 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Voltar para cursos
      </Link>
      <ModulesManager
        course={course}
        initialModules={modulesResult.data}
        subjects={subjectsResult.data}
        teachers={teachersResult.data}
        isAdmin={session?.role === "admin"}
      />
    </div>
  );
}
