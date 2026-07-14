import type { Metadata } from "next";
import { ErrorState } from "@/components/shared/error-state";
import { QuestionsManager } from "@/components/admin/questoes/questions-manager";
import { listQuestionsForAdminAction } from "@/server/actions/admin/questions";
import { listSubjectsForAdminAction } from "@/server/actions/admin/subjects";
import { listTopicsForAdminAction } from "@/server/actions/admin/topics";
import { getCurrentSession } from "@/server/authorization";

export const metadata: Metadata = {
  title: "Questões",
};

export default async function AdminQuestionsPage() {
  const [questionsResult, subjectsResult, topicsResult, session] = await Promise.all([
    listQuestionsForAdminAction(),
    listSubjectsForAdminAction(),
    listTopicsForAdminAction(),
    getCurrentSession(),
  ]);

  if (!questionsResult.ok) {
    return <ErrorState title="Não foi possível carregar as questões" description={questionsResult.error.message} />;
  }
  if (!subjectsResult.ok) {
    return <ErrorState title="Não foi possível carregar as matérias" description={subjectsResult.error.message} />;
  }
  if (!topicsResult.ok) {
    return <ErrorState title="Não foi possível carregar os assuntos" description={topicsResult.error.message} />;
  }

  return (
    <QuestionsManager
      initialQuestions={questionsResult.data}
      subjects={subjectsResult.data}
      topics={topicsResult.data}
      isAdmin={session?.role === "admin"}
    />
  );
}
