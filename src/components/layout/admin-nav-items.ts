import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  BookOpen,
  HelpCircle,
  Medal,
  Trophy,
  Library,
  Layers,
  GraduationCap,
  Users,
  SlidersHorizontal,
  ScrollText,
  Megaphone,
} from "lucide-react";

/**
 * Itens de navegação do painel administrativo (Fase 17 — UI do agente `frontend`), separados da
 * navegação do aluno (`@/components/layout/nav-items.ts`). Fonte única usada pelo sidebar
 * (desktop) e pelo menu mobile do admin, evitando duplicação — apenas dados de apresentação.
 *
 * `adminOnly: true` é só uma dica visual (esconder o item para `moderador`, CLAUDE.md/Fase 17:
 * "a UI pode mostrar controles... só para admin") — a proteção real está em
 * `@/server/services/admin/roles.ts` (`SENSITIVE_ADMIN_ONLY_ROLES`) e é sempre reforçada de novo
 * no servidor, nunca inferida daqui.
 */
export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Item visível só para `admin` (dashboard/config/auditoria são `SENSITIVE_ADMIN_ONLY_ROLES`). */
  adminOnly?: boolean;
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: "Visão geral",
    items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "Conteúdo",
    items: [
      { label: "Cursos", href: "/admin/cursos", icon: BookOpen },
      { label: "Questões", href: "/admin/questoes", icon: HelpCircle },
      { label: "Conquistas", href: "/admin/conquistas", icon: Medal },
      { label: "Simulados", href: "/admin/simulados", icon: Trophy },
      { label: "Concursos", href: "/admin/concursos", icon: Library },
      { label: "Matérias", href: "/admin/materias", icon: Layers },
      { label: "Assuntos", href: "/admin/assuntos", icon: Layers },
      { label: "Professores", href: "/admin/professores", icon: GraduationCap },
    ],
  },
  {
    label: "Gestão",
    items: [
      { label: "Usuários", href: "/admin/usuarios", icon: Users },
      { label: "Avisos e moderação", href: "/admin/avisos", icon: Megaphone },
      { label: "Configuração", href: "/admin/configuracao", icon: SlidersHorizontal, adminOnly: true },
      { label: "Auditoria", href: "/admin/auditoria", icon: ScrollText, adminOnly: true },
    ],
  },
];
