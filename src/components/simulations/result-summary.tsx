import { CheckCircle2, CircleDashed, Clock, Minus, Percent, TrendingDown, TrendingUp, XCircle } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { formatSecondsAsDuration } from "@/components/simulations/labels";
import type { AttemptResultDTO } from "@/contracts/simulations";

interface ResultSummaryProps {
  result: AttemptResultDTO;
}

/**
 * Cartões de resumo do resultado (nota, acertos, erros, não respondidas, tempo, evolução).
 * Server Component puramente apresentacional — todo valor já vem calculado pelo backend
 * (`buildAttemptResultDTO`); nenhuma nota/pontuação/tempo é derivada aqui.
 */
export function ResultSummary({ result }: ResultSummaryProps) {
  const evolution = result.evolutionPercent;
  const isPositive = evolution !== null && evolution > 0;
  const isNegative = evolution !== null && evolution < 0;
  const EvolutionIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  const evolutionClass = isPositive ? "text-success" : isNegative ? "text-destructive" : undefined;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard title="Aproveitamento" value={`${Math.round(result.scorePercent)}%`} icon={Percent} />
      <StatCard
        title="Acertos"
        value={result.correctCount.toLocaleString("pt-BR")}
        icon={CheckCircle2}
        valueClassName="text-success"
      />
      <StatCard
        title="Erros"
        value={result.wrongCount.toLocaleString("pt-BR")}
        icon={XCircle}
        valueClassName="text-destructive"
      />
      <StatCard title="Não respondidas" value={result.blankCount.toLocaleString("pt-BR")} icon={CircleDashed} />
      <StatCard title="Tempo" value={formatSecondsAsDuration(result.timeSpentSeconds)} icon={Clock} />
      <StatCard
        title="Evolução"
        value={evolution === null ? "—" : `${isPositive ? "+" : ""}${evolution.toFixed(1)}%`}
        hint={evolution === null ? "Sem tentativa anterior" : "vs. tentativa anterior"}
        icon={EvolutionIcon}
        valueClassName={evolutionClass}
      />
    </div>
  );
}
