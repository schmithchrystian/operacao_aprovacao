import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

interface AdminShellProps {
  children: ReactNode;
}

/**
 * Shell administrativo mínimo, separado do shell do aluno (docs/ARCHITECTURE.md §4).
 * Sem sidebar do aluno; navegação administrativa detalhada chega em fase dedicada.
 */
export function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="bg-background min-h-screen">
      <header className="border-border bg-card/60 flex h-16 items-center justify-between border-b px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-primary h-5 w-5" aria-hidden="true" />
          <span className="text-sm font-semibold tracking-tight">Operação Aprovação · Admin</span>
        </div>
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
        >
          Voltar para a plataforma do aluno
        </Link>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
