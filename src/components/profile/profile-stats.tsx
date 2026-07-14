import { Award, BookOpen, ClipboardList, Clock, Flame, Percent, Star, Trophy, Zap } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { formatMinutesAsDuration } from "@/lib/utils";
import type { OwnProfileDTO } from "./types";

interface ProfileStatsProps {
  profile: OwnProfileDTO;
}

const NOT_AVAILABLE = "—";

/**
 * Grade de estatísticas de "Meu perfil" (Fase 16 — UI do agente `frontend`): pontos, XP, posição
 * no ranking, horas estudadas, aulas concluídas, simulados realizados, média em simulados,
 * sequência de dias e conquistas. Todos os valores já vêm prontos em
 * `ProfileAggregatesDTO` (`getOwnProfileAction`) — nenhum cálculo de pontuação/ranking/tempo
 * válido acontece aqui, só formatação de apresentação.
 *
 * `rankingPosition`/`averageMockExamScorePercent`/`streakDays` podem ser `null` mesmo para o
 * DONO do perfil (não é máscara de privacidade — o dono sempre vê tudo; é genuinamente "ainda sem
 * dado", ex.: nenhum simulado finalizado ainda) — tratados com um traço e uma dica, nunca
 * escondidos ou zerados silenciosamente.
 */
export function ProfileStats({ profile }: ProfileStatsProps) {
  const { aggregates } = profile;

  const rankingValue =
    aggregates.rankingPosition !== null ? `#${aggregates.rankingPosition.toLocaleString("pt-BR")}` : NOT_AVAILABLE;
  const rankingHint =
    aggregates.rankingPosition !== null && aggregates.rankingTotalParticipants !== null
      ? `de ${aggregates.rankingTotalParticipants.toLocaleString("pt-BR")} participantes`
      : "Ainda sem posição no ranking geral.";

  const averageScoreValue =
    aggregates.averageMockExamScorePercent !== null ? `${Math.round(aggregates.averageMockExamScorePercent)}%` : NOT_AVAILABLE;
  const averageScoreHint =
    aggregates.averageMockExamScorePercent !== null ? undefined : "Nenhum simulado finalizado ainda.";

  const streakValue = aggregates.streakDays !== null ? `${aggregates.streakDays.toLocaleString("pt-BR")}` : NOT_AVAILABLE;
  const streakHint =
    aggregates.streakDays !== null
      ? aggregates.streakDays === 1
        ? "dia seguido"
        : "dias seguidos"
      : "Ainda sem sequência calculada.";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <StatCard title="Pontos" value={aggregates.points.toLocaleString("pt-BR")} icon={Star} />
      <StatCard title="XP total" value={aggregates.xp.toLocaleString("pt-BR")} icon={Zap} />
      <StatCard title="Posição no ranking" value={rankingValue} hint={rankingHint} icon={Trophy} />
      <StatCard
        title="Horas de estudo"
        value={formatMinutesAsDuration(Math.round((aggregates.studyHours ?? 0) * 60))}
        icon={Clock}
      />
      <StatCard
        title="Aulas concluídas"
        value={(aggregates.lessonsCompleted ?? 0).toLocaleString("pt-BR")}
        icon={BookOpen}
      />
      <StatCard
        title="Simulados realizados"
        value={(aggregates.mockExamsCompleted ?? 0).toLocaleString("pt-BR")}
        icon={ClipboardList}
      />
      <StatCard title="Média em simulados" value={averageScoreValue} hint={averageScoreHint} icon={Percent} />
      <StatCard title="Sequência" value={streakValue} hint={streakHint} icon={Flame} />
      <StatCard
        title="Conquistas"
        value={`${aggregates.achievementsUnlockedCount}/${aggregates.achievementsTotalCount}`}
        hint="desbloqueadas"
        icon={Award}
      />
    </div>
  );
}
