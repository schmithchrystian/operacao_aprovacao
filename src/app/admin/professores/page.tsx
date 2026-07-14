import type { Metadata } from "next";
import { ErrorState } from "@/components/shared/error-state";
import { TeachersManager } from "@/components/admin/professores/teachers-manager";
import { listTeachersForAdminAction } from "@/server/actions/admin/teachers";
import { getCurrentSession } from "@/server/authorization";

export const metadata: Metadata = {
  title: "Professores",
};

export default async function AdminTeachersPage() {
  const [result, session] = await Promise.all([listTeachersForAdminAction(), getCurrentSession()]);

  if (!result.ok) {
    return <ErrorState title="Não foi possível carregar os professores" description={result.error.message} />;
  }

  return <TeachersManager initialTeachers={result.data} isAdmin={session?.role === "admin"} />;
}
