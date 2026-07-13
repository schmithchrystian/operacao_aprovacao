import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

/**
 * Layout minimalista para autenticação (login, registro, recuperação de senha).
 * Sem sidebar/topbar do aluno.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 flex items-center gap-2">
        <ShieldCheck className="text-primary h-7 w-7" aria-hidden="true" />
        <span className="text-lg font-semibold tracking-tight">Operação Aprovação</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
