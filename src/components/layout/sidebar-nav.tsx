"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { STUDENT_NAV_ITEMS } from "./nav-items";

interface SidebarNavProps {
  /** Chamado após navegar — usado para fechar o Sheet no menu mobile. */
  onNavigate?: () => void;
  className?: string;
}

/**
 * Lista de navegação do aluno. Client Component: precisa de `usePathname` para
 * destacar a rota ativa (única parte "interativa" da sidebar — CLAUDE.md §9).
 * Reutilizado tanto pela Sidebar (desktop) quanto pelo MobileNav (Sheet).
 */
export function SidebarNav({ onNavigate, className }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegação principal" className={cn("flex flex-col gap-1", className)}>
      {STUDENT_NAV_ITEMS.map((item) => {
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
    </nav>
  );
}
