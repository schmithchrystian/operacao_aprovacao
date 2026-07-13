import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { CourseCatalog } from "@/components/courses/course-catalog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { listCoursesAction } from "@/server/actions/courses";

export const metadata: Metadata = { title: "Cursos" };

/**
 * Catálogo de cursos (Fase 6). Server Component: busca `CourseSummaryDTO[]` já pronto via
 * `listCoursesAction` (matrícula/progresso do usuário autenticado já anexados pelo serviço)
 * e só renderiza. Nenhum cálculo de progresso/matrícula acontece aqui.
 */
export default async function CursosPage() {
  const result = await listCoursesAction();

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Início", href: "/dashboard" }, { label: "Cursos" }]} />
      <h1 className="text-2xl font-semibold tracking-tight">Cursos</h1>

      {!result.ok ? (
        <ErrorState
          title="Não foi possível carregar o catálogo"
          description={result.error.message}
        />
      ) : result.data.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Nenhum curso disponível"
          description="Ainda não há cursos publicados para o seu concurso."
        />
      ) : (
        <CourseCatalog courses={result.data} />
      )}
    </div>
  );
}
