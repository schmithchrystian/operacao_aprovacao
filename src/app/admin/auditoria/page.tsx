import type { Metadata } from "next";
import { ErrorState } from "@/components/shared/error-state";
import { AuditLogTable } from "@/components/admin/auditoria/audit-log-table";
import { listAuditLogAction } from "@/server/actions/admin/audit";

export const metadata: Metadata = {
  title: "Auditoria",
};

/** `/admin/auditoria` (Fase 17 — item 6). Só `admin` — mesmo tratamento de `FORBIDDEN` de
 *  `/admin/configuracao/page.tsx` para um moderador que navegue direto para a URL. */
export default async function AdminAuditPage() {
  const result = await listAuditLogAction({ page: 1, pageSize: 20 });

  if (!result.ok) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Auditoria</h1>
        <ErrorState title="Acesso restrito" description={result.error.message} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Auditoria</h1>
        <p className="text-muted-foreground text-sm">Registro de operações administrativas (somente admin).</p>
      </div>
      <AuditLogTable initialPage={result.data} />
    </div>
  );
}
