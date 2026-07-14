/**
 * Níveis de gamificação (CLAUDE.md §16, Fase 8 — agente `gamification`).
 *
 * Puramente mecânica de jogo — os nomes NÃO representam patentes oficiais (CLAUDE.md §16).
 * `minXp` é o limiar (inclusive) de XP acumulado para alcançar o nível; os valores abaixo
 * reproduzem exatamente os limiares já exibidos no dashboard mock (Fase 5,
 * `src/mocks/data/dashboard-gamification.ts`) para não regredir a demo existente:
 * Recruta 0, Aspirante 1000, Combatente 2500, Especialista 5000, Veterano 9000, Comandante
 * 15000. "Elite" (único nível sem limiar pré-existente no mock) fica no meio do caminho
 * entre Veterano e Comandante (12000).
 */
export interface LevelDefinition {
  /** 1-based, na ordem oficial (CLAUDE.md §16). */
  index: number;
  key: string;
  name: string;
  /** XP mínimo (inclusive) para alcançar este nível. */
  minXp: number;
  /** Nome de ícone `lucide-react` — o `frontend` resolve para o componente. */
  icon: string;
  /** Texto curto de benefício visual (não concede vantagem de negócio real). */
  benefit: string;
}

export const LEVELS: readonly LevelDefinition[] = [
  {
    index: 1,
    key: "recruta",
    name: "Recruta",
    minXp: 0,
    icon: "Shield",
    benefit: "Iniciando a jornada rumo à aprovação.",
  },
  {
    index: 2,
    key: "aspirante",
    name: "Aspirante",
    minXp: 1000,
    icon: "ShieldHalf",
    benefit: "Primeiros resultados começam a aparecer.",
  },
  {
    index: 3,
    key: "combatente",
    name: "Combatente",
    minXp: 2500,
    icon: "Swords",
    benefit: "Consistência nos estudos em construção.",
  },
  {
    index: 4,
    key: "especialista",
    name: "Especialista",
    minXp: 5000,
    icon: "Target",
    benefit: "Domínio sólido do conteúdo.",
  },
  {
    index: 5,
    key: "veterano",
    name: "Veterano",
    minXp: 9000,
    icon: "Medal",
    benefit: "Preparação avançada para a prova.",
  },
  {
    index: 6,
    key: "elite",
    name: "Elite",
    minXp: 12000,
    icon: "Award",
    benefit: "Entre os estudantes mais dedicados.",
  },
  {
    index: 7,
    key: "comandante",
    name: "Comandante",
    minXp: 15000,
    icon: "Crown",
    benefit: "Nível máximo — referência de disciplina e constância.",
  },
] as const;

export interface ComputedLevel {
  level: LevelDefinition;
  /** XP mínimo do nível atual (base da barra de progresso). */
  currentLevelXp: number;
  /** XP mínimo do próximo nível, ou `null` no nível máximo (Comandante). */
  nextLevelXp: number | null;
  /** Progresso (0–100) dentro da faixa do nível atual; `100` no nível máximo. */
  progressPercent: number;
  /** XP que falta para o próximo nível; `null` no nível máximo. */
  xpToNextLevel: number | null;
}

/**
 * Função PURA (CLAUDE.md §9 — sem I/O, sem `Date`, sem repositório) que determina o nível
 * atual a partir do XP acumulado e o progresso até o próximo. XP negativo é tratado como 0
 * (defesa em profundidade — nunca deveria ocorrer, pois o ledger só decresce via `REVERSAL`
 * explícito, nunca abaixo do que foi realmente ganho em uso normal).
 */
export function computeLevel(xp: number): ComputedLevel {
  const safeXp = Number.isFinite(xp) && xp > 0 ? xp : 0;

  let current = LEVELS[0]!;
  for (const level of LEVELS) {
    if (safeXp >= level.minXp) {
      current = level;
    } else {
      break;
    }
  }

  const next = LEVELS.find((level) => level.minXp > current.minXp && level.index === current.index + 1) ?? null;

  if (!next) {
    return {
      level: current,
      currentLevelXp: current.minXp,
      nextLevelXp: null,
      progressPercent: 100,
      xpToNextLevel: null,
    };
  }

  const band = next.minXp - current.minXp;
  const progressInBand = safeXp - current.minXp;
  const progressPercent = band > 0 ? Math.min(100, Math.max(0, (progressInBand / band) * 100)) : 100;

  return {
    level: current,
    currentLevelXp: current.minXp,
    nextLevelXp: next.minXp,
    progressPercent,
    xpToNextLevel: Math.max(0, next.minXp - safeXp),
  };
}
