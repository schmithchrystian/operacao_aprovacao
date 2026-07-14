import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ErrorState } from "@/components/shared/error-state";
import { LevelHeader } from "@/components/achievements/level-header";
import { LevelTrack } from "@/components/achievements/level-track";
import { AchievementGrid } from "@/components/achievements/achievement-grid";
import { getUserGamificationAction } from "@/server/actions/gamification";
import { LEVELS } from "@/server/services/gamification/levels";

export const metadata: Metadata = { title: "Conquistas" };

/**
 * Página de Conquistas (Fase 8 — UI do agente `frontend`). Server Component: busca o
 * `UserGamificationView` já pronto via `getUserGamificationAction` (autenticação/autorização
 * e agregação de pontos/XP/nível/conquistas ficam em `@/server/actions/gamification` e
 * `@/server/services/gamification`) e só renderiza. Nenhum cálculo de pontos/XP/nível/
 * critério de conquista acontece aqui — a única "lógica" local é comparar índices para
 * classificar a trilha de níveis como alcançado/atual/bloqueado (puramente apresentacional).
 *
 * `LEVELS` é consumida diretamente do serviço de gamificação apenas como dado estático
 * (nome/XP mínimo/ícone/benefício de cada um dos 7 níveis) para desenhar a trilha completa —
 * o `ComputedLevel` retornado pela action só descreve o nível atual, não a lista inteira.
 */
export default async function ConquistasPage() {
  const result = await getUserGamificationAction();

  if (!result.ok) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "Início", href: "/dashboard" }, { label: "Conquistas" }]} />
        <ErrorState title="Não foi possível carregar suas conquistas" description={result.error.message} />
      </div>
    );
  }

  const { points, xp, level, achievements } = result.data;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Início", href: "/dashboard" }, { label: "Conquistas" }]} />
      <h1 className="text-2xl font-semibold tracking-tight">Conquistas</h1>

      <LevelHeader computedLevel={level} points={points} xp={xp} />
      <LevelTrack levels={LEVELS} currentLevelIndex={level.level.index} />
      <AchievementGrid achievements={achievements} />
    </div>
  );
}
