import type { Metadata } from "next";
import { ErrorState } from "@/components/shared/error-state";
import { MockExamsManager } from "@/components/admin/simulados/mock-exams-manager";
import { listMockExamsForAdminAction } from "@/server/actions/admin/mock-exams";
import { listQuestionsForAdminAction } from "@/server/actions/admin/questions";
import { getCurrentSession } from "@/server/authorization";

export const metadata: Metadata = {
  title: "Simulados",
};

export default async function AdminMockExamsPage() {
  const [mockExamsResult, questionsResult, session] = await Promise.all([
    listMockExamsForAdminAction(),
    listQuestionsForAdminAction(),
    getCurrentSession(),
  ]);

  if (!mockExamsResult.ok) {
    return <ErrorState title="Não foi possível carregar os simulados" description={mockExamsResult.error.message} />;
  }
  if (!questionsResult.ok) {
    return <ErrorState title="Não foi possível carregar as questões" description={questionsResult.error.message} />;
  }

  return (
    <MockExamsManager
      initialMockExams={mockExamsResult.data}
      questions={questionsResult.data}
      isAdmin={session?.role === "admin"}
    />
  );
}
