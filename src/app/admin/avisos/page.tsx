import type { Metadata } from "next";
import { ErrorState } from "@/components/shared/error-state";
import { BroadcastForm } from "@/components/admin/avisos/broadcast-form";
import { ModerationPanel } from "@/components/admin/avisos/moderation-panel";
import { listCoursesForAdminAction } from "@/server/actions/admin/courses";
import { listQuestionsForAdminAction } from "@/server/actions/admin/questions";

export const metadata: Metadata = {
  title: "Avisos e moderação",
};

/** `/admin/avisos` (Fase 17 — item 7, versão mínima): publicar aviso (broadcast) + moderar
 *  visibilidade de curso/questão. Disponível para admin e moderador (`CONTENT_MANAGE_ROLES`). */
export default async function AdminNoticesPage() {
  const [coursesResult, questionsResult] = await Promise.all([
    listCoursesForAdminAction(),
    listQuestionsForAdminAction(),
  ]);

  if (!coursesResult.ok) {
    return <ErrorState title="Não foi possível carregar os cursos" description={coursesResult.error.message} />;
  }
  if (!questionsResult.ok) {
    return <ErrorState title="Não foi possível carregar as questões" description={questionsResult.error.message} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Avisos e moderação</h1>
        <p className="text-muted-foreground text-sm">Publicar avisos para os usuários e moderar conteúdo publicado.</p>
      </div>
      <BroadcastForm />
      <ModerationPanel courses={coursesResult.data} questions={questionsResult.data} />
    </div>
  );
}
