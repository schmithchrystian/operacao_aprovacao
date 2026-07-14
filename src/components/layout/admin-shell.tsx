import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { getCurrentSession } from "@/server/authorization";
import { AdminMobileNav } from "./admin-mobile-nav";
import { AdminSidebarNav } from "./admin-sidebar-nav";
import { ThemeToggle } from "./theme-toggle";

interface AdminShellProps {
  children: ReactNode;
}

/**
 * Shell administrativo (docs/ARCHITECTURE.md §4), separado do shell do aluno: sidebar (desktop) +
 * topbar com menu mobile + conteúdo — mesma composição de `@/components/layout/student-shell.tsx`,
 * adaptada à navegação admin (`admin-nav-items.ts`).
 *
 * Server Component: a sessão já foi validada por `requireRole('admin','moderador')` em
 * `admin/layout.tsx` antes deste componente renderizar; aqui só lemos `getCurrentSession()` de
 * novo para saber o PAPEL exibido (esconder itens `adminOnly` para moderador) — nunca a
 * autorização em si, que continua 100% server-side.
 */
export async function AdminShell({ children }: AdminShellProps) {
  const session = await getCurrentSession();
  const role = session?.role ?? "moderador";

  return (
    <div className="bg-background flex min-h-screen">
      <aside className="border-sidebar-border bg-sidebar hidden w-64 shrink-0 border-r lg:flex lg:flex-col">
        <div className="border-sidebar-border flex h-16 items-center gap-2 border-b px-5">
          <ShieldCheck className="text-sidebar-primary h-6 w-6" aria-hidden="true" />
          <span className="text-sidebar-foreground text-base font-semibold tracking-tight">Admin</span>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <AdminSidebarNav role={role} />
        </div>
        <div className="border-sidebar-border border-t p-3">
          <Link
            href="/dashboard"
            className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors"
          >
            Voltar para a plataforma do aluno
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border bg-background/95 supports-backdrop-filter:bg-background/70 sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 backdrop-blur sm:px-6">
          <AdminMobileNav role={role} />
          <div className="flex items-center gap-2 lg:hidden">
            <ShieldCheck className="text-primary h-5 w-5" aria-hidden="true" />
            <span className="text-sm font-semibold tracking-tight">Admin</span>
          </div>
          <div className="flex-1" />
          <ThemeToggle />
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground hidden text-sm underline-offset-4 hover:underline lg:inline"
          >
            Voltar para o app do aluno
          </Link>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
