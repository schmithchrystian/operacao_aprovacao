import { ShieldCheck } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";

/**
 * Sidebar do aluno (desktop). Server Component — apenas a navegação (SidebarNav)
 * precisa ser Client Component para destacar a rota ativa.
 */
export function Sidebar() {
  return (
    <aside className="border-sidebar-border bg-sidebar hidden w-64 shrink-0 border-r lg:flex lg:flex-col">
      <div className="border-sidebar-border flex h-16 items-center gap-2 border-b px-5">
        <ShieldCheck className="text-sidebar-primary h-6 w-6" aria-hidden="true" />
        <span className="text-sidebar-foreground text-base font-semibold tracking-tight">
          Operação Aprovação
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <SidebarNav />
      </div>
    </aside>
  );
}
