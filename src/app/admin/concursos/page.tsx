import type { Metadata } from "next";
import { ErrorState } from "@/components/shared/error-state";
import { ContestsManager } from "@/components/admin/concursos/contests-manager";
import { listContestsForAdminAction } from "@/server/actions/admin/contests";
import { getCurrentSession } from "@/server/authorization";

export const metadata: Metadata = {
  title: "Concursos",
};

export default async function AdminContestsPage() {
  const [result, session] = await Promise.all([listContestsForAdminAction(), getCurrentSession()]);

  if (!result.ok) {
    return <ErrorState title="Não foi possível carregar os concursos" description={result.error.message} />;
  }

  return <ContestsManager initialContests={result.data} isAdmin={session?.role === "admin"} />;
}
