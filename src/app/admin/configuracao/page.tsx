import type { Metadata } from "next";
import { ErrorState } from "@/components/shared/error-state";
import { ConfigForm } from "@/components/admin/configuracao/config-form";
import { getBusinessConfigForAdminAction } from "@/server/actions/admin/config";

export const metadata: Metadata = {
  title: "Configuração",
};

/**
 * `/admin/configuracao` (Fase 17 — item 5). Só `admin` (`SENSITIVE_ADMIN_ONLY_ROLES`) — o layout
 * `admin/layout.tsx` deixa `moderador` entrar na ÁREA administrativa, mas
 * `getBusinessConfigForAdminAction` rejeita com `FORBIDDEN` para esse papel; exibimos a mensagem
 * de erro real do backend em vez de um redirecionamento silencioso (CLAUDE.md/Fase 17: refletir
 * a mensagem de erro do `ActionResult`).
 */
export default async function AdminConfigPage() {
  const result = await getBusinessConfigForAdminAction();

  if (!result.ok) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Configuração</h1>
        <ErrorState title="Acesso restrito" description={result.error.message} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuração</h1>
        <p className="text-muted-foreground text-sm">Pontuação, níveis e pesos de ranking (somente admin).</p>
      </div>
      <ConfigForm initialConfig={result.data} />
    </div>
  );
}
