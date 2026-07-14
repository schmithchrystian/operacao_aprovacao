import type { Metadata } from "next";
import { ErrorState } from "@/components/shared/error-state";
import { UsersManager } from "@/components/admin/usuarios/users-manager";
import { listUsersForAdminAction } from "@/server/actions/admin/list-users";
import { getCurrentSession } from "@/server/authorization";

export const metadata: Metadata = {
  title: "Usuários",
};

export default async function AdminUsersPage() {
  const [result, session] = await Promise.all([listUsersForAdminAction(), getCurrentSession()]);

  if (!result.ok) {
    return <ErrorState title="Não foi possível carregar os usuários" description={result.error.message} />;
  }

  return <UsersManager initialUsers={result.data} isAdmin={session?.role === "admin"} />;
}
