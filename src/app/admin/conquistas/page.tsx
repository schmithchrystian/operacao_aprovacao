import type { Metadata } from "next";
import { ErrorState } from "@/components/shared/error-state";
import { AchievementsManager } from "@/components/admin/conquistas/achievements-manager";
import { listAchievementsForAdminAction } from "@/server/actions/admin/achievements";
import { getCurrentSession } from "@/server/authorization";

export const metadata: Metadata = {
  title: "Conquistas",
};

export default async function AdminAchievementsPage() {
  const [result, session] = await Promise.all([listAchievementsForAdminAction(), getCurrentSession()]);

  if (!result.ok) {
    return <ErrorState title="Não foi possível carregar as conquistas" description={result.error.message} />;
  }

  return <AchievementsManager initialAchievements={result.data} isAdmin={session?.role === "admin"} />;
}
