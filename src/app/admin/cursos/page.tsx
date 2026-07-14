import type { Metadata } from "next";
import { ErrorState } from "@/components/shared/error-state";
import { CoursesManager } from "@/components/admin/cursos/courses-manager";
import { listCoursesForAdminAction } from "@/server/actions/admin/courses";
import { listContestsForAdminAction } from "@/server/actions/admin/contests";
import { getCurrentSession } from "@/server/authorization";

export const metadata: Metadata = {
  title: "Cursos",
};

/** Lista/gestão de cursos (Fase 17 — item 3). Server Component: busca cursos + concursos
 *  (para o select do formulário) no servidor e repassa para o Client Component interativo. */
export default async function AdminCoursesPage() {
  const [coursesResult, contestsResult, session] = await Promise.all([
    listCoursesForAdminAction(),
    listContestsForAdminAction(),
    getCurrentSession(),
  ]);

  if (!coursesResult.ok) {
    return <ErrorState title="Não foi possível carregar os cursos" description={coursesResult.error.message} />;
  }
  if (!contestsResult.ok) {
    return <ErrorState title="Não foi possível carregar os concursos" description={contestsResult.error.message} />;
  }

  return (
    <CoursesManager
      initialCourses={coursesResult.data}
      contests={contestsResult.data}
      isAdmin={session?.role === "admin"}
    />
  );
}
