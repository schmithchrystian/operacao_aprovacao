import type { Metadata } from "next";
import { ErrorState } from "@/components/shared/error-state";
import { SubjectsManager } from "@/components/admin/materias/subjects-manager";
import { listSubjectsForAdminAction } from "@/server/actions/admin/subjects";
import { getCurrentSession } from "@/server/authorization";

export const metadata: Metadata = {
  title: "Matérias",
};

export default async function AdminSubjectsPage() {
  const [result, session] = await Promise.all([listSubjectsForAdminAction(), getCurrentSession()]);

  if (!result.ok) {
    return <ErrorState title="Não foi possível carregar as matérias" description={result.error.message} />;
  }

  return <SubjectsManager initialSubjects={result.data} isAdmin={session?.role === "admin"} />;
}
