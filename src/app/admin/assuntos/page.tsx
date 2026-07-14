import type { Metadata } from "next";
import { ErrorState } from "@/components/shared/error-state";
import { TopicsManager } from "@/components/admin/assuntos/topics-manager";
import { listTopicsForAdminAction } from "@/server/actions/admin/topics";
import { listSubjectsForAdminAction } from "@/server/actions/admin/subjects";
import { getCurrentSession } from "@/server/authorization";

export const metadata: Metadata = {
  title: "Assuntos",
};

export default async function AdminTopicsPage() {
  const [topicsResult, subjectsResult, session] = await Promise.all([
    listTopicsForAdminAction(),
    listSubjectsForAdminAction(),
    getCurrentSession(),
  ]);

  if (!topicsResult.ok) {
    return <ErrorState title="Não foi possível carregar os assuntos" description={topicsResult.error.message} />;
  }
  if (!subjectsResult.ok) {
    return <ErrorState title="Não foi possível carregar as matérias" description={subjectsResult.error.message} />;
  }

  return (
    <TopicsManager initialTopics={topicsResult.data} subjects={subjectsResult.data} isAdmin={session?.role === "admin"} />
  );
}
