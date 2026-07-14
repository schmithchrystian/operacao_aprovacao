import { BarChart3, CheckCircle2, Clock } from "lucide-react";
import { FlashcardRetentionChart } from "@/components/charts/flashcard-retention-chart";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RetentionStatsDTO } from "@/contracts/flashcards";

interface RetentionPanelProps {
  stats: RetentionStatsDTO;
}

/**
 * Bloco de retenção do hub de Flashcards (Fase 14 — UI). Server-safe (sem `"use client"` própria
 * — só renderiza o gráfico Client, `FlashcardRetentionChart`); todo valor exibido já vem pronto
 * de `getRetentionStatsAction` (`RetentionStatsDTO`), nenhum cálculo de retenção/pontuação
 * acontece aqui (CLAUDE.md — "não calcule regra crítica no frontend").
 *
 * Sem revisões ainda (`totalReviews === 0`) é um estado legítimo (aluno novo) — mostra uma
 * mensagem em vez de um gráfico de pizza vazio/enganoso.
 */
export function RetentionPanel({ stats }: RetentionPanelProps) {
  return (
    <section aria-labelledby="flashcards-retencao" className="space-y-3">
      <h2 id="flashcards-retencao" className="text-lg font-semibold tracking-tight">
        Retenção
      </h2>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <StatCard
            title="Retenção"
            value={`${Math.round(stats.retentionPercent)}%`}
            icon={BarChart3}
            hint={`${stats.correctReviews} de ${stats.totalReviews} revisões corretas`}
            valueClassName={stats.totalReviews > 0 ? "text-success" : undefined}
          />
          <StatCard
            title="Cartões em estudo"
            value={`${stats.cardsReviewedAtLeastOnce} / ${stats.totalCards}`}
            icon={CheckCircle2}
            hint="Já revisados ao menos uma vez"
          />
          <StatCard
            title="Devidos agora"
            value={String(stats.dueNowCount)}
            icon={Clock}
            hint="Cartões prontos para revisar"
          />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Acertos x erros nas revisões</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.totalReviews > 0 ? (
              <FlashcardRetentionChart data={stats} />
            ) : (
              <p className="text-muted-foreground py-10 text-center text-sm">
                Ainda não há revisões suficientes para calcular a retenção. Revise alguns cartões para ver o
                gráfico aqui.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
