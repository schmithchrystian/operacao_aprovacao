import {
  Award,
  BookOpen,
  BookOpenCheck,
  CalendarCheck,
  CalendarCheck2,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Crown,
  Flame,
  HelpCircle,
  Layers,
  Medal,
  Shield,
  ShieldHalf,
  Star,
  Swords,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";

/**
 * Allowlist nome (`lucide-react`) -> componente. Cobre os ícones usados pelas definições
 * de nível (`@/server/services/gamification/levels`) e de conquista
 * (`@/server/services/gamification/achievements`) — ambos guardam apenas o *nome* do ícone
 * como string (dado serializável), cabendo ao frontend resolver o componente real.
 *
 * Deliberadamente uma allowlist estática (nunca indexação dinâmica tipo
 * `(LucideIcons as Record<string, LucideIcon>)[name]`): isso evitaria `any`/asserções
 * inseguras e permitiria renderizar qualquer export do pacote a partir de uma string vinda
 * do backend. Nomes fora da allowlist caem no fallback.
 */
export const ICON_ALLOWLIST: Record<string, LucideIcon> = {
  Award,
  BookOpen,
  BookOpenCheck,
  CalendarCheck,
  CalendarCheck2,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Crown,
  Flame,
  Layers,
  Medal,
  Shield,
  ShieldHalf,
  Star,
  Swords,
  Target,
  Trophy,
};

/**
 * Ícone de fallback seguro para nomes de ícone ainda não mapeados na allowlist acima.
 *
 * Exportado como constante (nunca via função tipo `resolveLucideIcon(name)`) porque a regra
 * de lint `react-hooks/static-components` sinaliza como "criar componente durante o render"
 * qualquer resultado de *chamada de função* usado como componente JSX — mesmo que a função só
 * faça uma indexação estável. O padrão seguro (já usado em `lesson-status.tsx` e no
 * `AchievementsList` do dashboard) é indexar o `Record` diretamente no call site:
 * `ICON_ALLOWLIST[name] ?? FALLBACK_ICON`.
 */
export const FALLBACK_ICON: LucideIcon = HelpCircle;
