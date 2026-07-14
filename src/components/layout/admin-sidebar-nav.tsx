"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";
import { ADMIN_NAV_GROUPS } from "./admin-nav-items";

interface AdminSidebarNavProps {
  role: Role;
  /** Chamado após navegar — usado para fechar o Sheet no menu mobile. */
  onNavigate?: () => void;
  className?: string;
}

/**
 * Lista de navegação do admin, agrupada por seção. Client Component: precisa de `usePathname`
 * para destacar a rota ativa (mesmo padrão de `@/components/layout/sidebar-nav.tsx`, o
 * equivalente do lado do aluno). Itens `adminOnly` somem para `moderador` — só dica visual,
 * nunca a autorização real (sempre reforçada de novo em `requireRole`/`withAdminAudit`).
 */
export function AdminSidebarNav({ role, onNavigate, className }: AdminSidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegação administrativa" className={cn("flex flex-col gap-4", className)}>
      {ADMIN_NAV_GROUPS.map((group) => {
        const visibleItems = group.items.filter((item) => !item.adminOnly || role === "admin");
        if (visibleItems.length === 0) return null;

        return (
          <div key={group.label} className="flex flex-col gap-1">
            <p className="text-sidebar-foreground/50 px-3 text-xs font-semibold tracking-wide uppercase">
              {group.label}
            </p>
            {visibleItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    "focus-visible:ring-ring focus-visible:ring-offset-sidebar outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  )}
                >
                  <Icon
                    className={cn("h-4 w-4 shrink-0", isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50")}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
