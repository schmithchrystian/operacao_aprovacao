import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { listUsersForAdminAction } from "@/server/actions/admin/list-users";

export const metadata: Metadata = {
  title: "Administração",
};

/**
 * A contagem de usuários abaixo é só um exemplo mínimo, funcional, de
 * `withAdminAudit` em uso (Fase 4, item 7) — não uma tela de gestão de usuários.
 * `admin/layout.tsx` já garante `requireRole('admin','moderador')` antes de chegar
 * aqui; `listUsersForAdminAction` reforça a mesma checagem e registra auditoria.
 */
export default async function AdminHomePage() {
  const result = await listUsersForAdminAction();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Administração</h1>
      {result.ok ? (
        <p className="text-muted-foreground text-sm">
          Usuários cadastrados (mock):{" "}
          <span className="text-foreground font-medium">{result.data.length}</span>
        </p>
      ) : (
        <p className="text-destructive text-sm">{result.error.message}</p>
      )}
      <EmptyState
        icon={Settings}
        title="Em construção"
        description="O painel administrativo de conteúdo será implementado em uma etapa dedicada."
      />
    </div>
  );
}
