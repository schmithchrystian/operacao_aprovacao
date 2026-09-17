import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Route,
  BookOpen,
  ClipboardList,
  FileCheck2,
  CalendarDays,
  LineChart,
  Lightbulb,
  Layers,
  Timer,
  Trophy,
  Medal,
  User,
} from "lucide-react";

/**
 * Itens de navegação do aluno (docs/ARCHITECTURE.md §4, CLAUDE.md §7).
 * Fonte única usada pela Sidebar (desktop) e pelo MobileNav (Sheet), evitando duplicação.
 * Apenas dados de apresentação — nenhuma regra de negócio.
 */
export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const STUDENT_NAV_ITEMS: NavItem[] = [
  { label: "Início", href: "/dashboard", icon: LayoutDashboard },
  { label: "Minha trilha", href: "/trilha", icon: Route },
  { label: "Cursos", href: "/cursos", icon: BookOpen },
  { label: "Professor RS", href: "/professor-rs", icon: Lightbulb },
  { label: "Montar estudo", href: "/montar-estudo", icon: ClipboardList },
  { label: "Simulados", href: "/simulados", icon: FileCheck2 },
  { label: "Plano de estudos", href: "/plano-de-estudos", icon: CalendarDays },
  { label: "Acompanhamento", href: "/acompanhamento", icon: LineChart },
  { label: "Brainstorm", href: "/brainstorm", icon: Lightbulb },
  { label: "Flashcards", href: "/flashcards", icon: Layers },
  { label: "Modo foco", href: "/modo-foco", icon: Timer },
  { label: "Ranking", href: "/ranking", icon: Trophy },
  { label: "Conquistas", href: "/conquistas", icon: Medal },
  { label: "Perfil", href: "/perfil", icon: User },
];
