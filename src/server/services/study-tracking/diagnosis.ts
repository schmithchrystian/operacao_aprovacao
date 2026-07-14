import { STUDY_TRACKING_OVERVIEW } from "@/config/business";
import type { DiagnosisDTO, DiagnosisRiskLevel, TrackingOverviewDTO } from "@/contracts/tracking";

/**
 * Diagnóstico de preparação (Fase 12 — agente `study-tracking`, CLAUDE.md — "diagnóstico de
 * preparação"). Núcleo PURO (sem I/O, sem `Date.now()`/`Math.random()`): recebe o
 * `TrackingOverviewDTO` já agregado (`./tracking-overview.ts`) e devolve pontos fortes/fracos,
 * prioridades, risco de atraso e sugestões — SEMPRE a mesma saída para a mesma entrada.
 *
 * Deliberadamente SEM "IA mágica": cada frase é rastreável a um limiar documentado em
 * `STUDY_TRACKING_OVERVIEW` (`config/business.ts`) — uma heurística de regras simples, fácil de
 * explicar ao aluno e de ajustar/testar (CLAUDE.md — "heurística clara e documentada").
 */

const {
  minSampleForPerformance: MIN_SAMPLE,
  weakSubjectAccuracyThreshold: WEAK_THRESHOLD,
  progressGapHighRiskPercent: HIGH_RISK_GAP,
  progressGapMediumRiskPercent: MEDIUM_RISK_GAP,
  lowConsistencyRiskPercent: LOW_CONSISTENCY,
} = STUDY_TRACKING_OVERVIEW;

/** Só entra na análise de forte/fraco quando há amostra mínima (`MIN_SAMPLE`) — evita
 *  classificar uma matéria a partir de 1 questão respondida por sorte/azar. */
function hasEnoughSample(total: number): boolean {
  return total >= MIN_SAMPLE;
}

function computeStrengths(overview: TrackingOverviewDTO): string[] {
  const strengths: string[] = [];

  const strongSubjects = overview.subjectPerformance
    .filter((entry) => hasEnoughSample(entry.total) && entry.accuracyPercent >= 80)
    .sort((a, b) => b.accuracyPercent - a.accuracyPercent);
  for (const entry of strongSubjects) {
    strengths.push(`Bom desempenho em ${entry.subjectName} (${entry.accuracyPercent}% de acerto).`);
  }

  if (overview.streak.currentStreak >= 7) {
    strengths.push(`Sequência atual de ${overview.streak.currentStreak} dia(s) consecutivos de estudo.`);
  }

  if (overview.consistency.consistencyPercent >= 80) {
    strengths.push(
      `Consistência de ${overview.consistency.consistencyPercent}% nos últimos ${overview.consistency.windowDays} dias.`,
    );
  }

  if (strengths.length === 0) {
    strengths.push("Ainda não há dados suficientes para apontar pontos fortes com confiança.");
  }
  return strengths;
}

function computeWeaknesses(overview: TrackingOverviewDTO): string[] {
  const weaknesses: string[] = [];

  const weakSubjects = overview.subjectPerformance
    .filter((entry) => hasEnoughSample(entry.total) && entry.accuracyPercent < WEAK_THRESHOLD)
    .sort((a, b) => a.accuracyPercent - b.accuracyPercent);
  for (const entry of weakSubjects) {
    weaknesses.push(`${entry.subjectName}: ${entry.accuracyPercent}% de acerto (abaixo de ${WEAK_THRESHOLD}%).`);
  }

  if (overview.overdueReviews.length > 0) {
    weaknesses.push(`${overview.overdueReviews.length} revisão(ões) atrasada(s) no plano de estudos.`);
  }

  if (overview.pendingContents.length > 0) {
    weaknesses.push(`${overview.pendingContents.length} matéria(s) ainda sem nenhum estudo registrado.`);
  }

  if (weaknesses.length === 0) {
    weaknesses.push("Nenhum ponto fraco identificado com os dados atuais.");
  }
  return weaknesses;
}

/** Até 5 prioridades, mais urgente primeiro: matérias fracas > revisões atrasadas > conteúdo pendente. */
function computePriorities(overview: TrackingOverviewDTO): string[] {
  const priorities: string[] = [];

  const weakSubjects = [...overview.subjectPerformance]
    .filter((entry) => hasEnoughSample(entry.total) && entry.accuracyPercent < WEAK_THRESHOLD)
    .sort((a, b) => a.accuracyPercent - b.accuracyPercent)
    .slice(0, 3);
  for (const entry of weakSubjects) {
    priorities.push(`Reforçar ${entry.subjectName} (${entry.accuracyPercent}% de acerto).`);
  }

  const mostOverdue = [...overview.overdueReviews].sort((a, b) => b.daysLate - a.daysLate).slice(0, 3);
  for (const review of mostOverdue) {
    priorities.push(`Revisar "${review.title}" (${review.daysLate} dia(s) de atraso).`);
  }

  if (priorities.length === 0 && overview.pendingContents.length > 0) {
    priorities.push(`Iniciar o estudo de ${overview.pendingContents[0]!.subjectName}.`);
  }

  if (priorities.length === 0) {
    priorities.push("Manter o ritmo atual — nenhuma prioridade crítica identificada.");
  }

  return priorities.slice(0, 5);
}

interface DelayRiskResult {
  risk: DiagnosisRiskLevel;
  reason: string;
}

/**
 * Risco de atraso (CLAUDE.md — "risco de atraso... com base na data da prova/ritmo"):
 * 1. Sem plano/prova definidos → `LOW` (nada a avaliar; o motivo comunica isso explicitamente,
 *    não deve ser lido como "está tudo bem").
 * 2. Prova já passou → `HIGH`.
 * 3. Diferença entre progresso REAL e progresso ESPERADO (linear pelo tempo decorrido,
 *    `TrackingOverviewDTO.examProgress.expectedProgressPercent`) abaixo de `HIGH_RISK_GAP`
 *    pontos percentuais → `HIGH`.
 * 4. Prova em ≤7 dias com QUALQUER atraso (`gap < 0`) → `HIGH` (pouca margem para recuperar).
 * 5. Gap moderado (abaixo de `MEDIUM_RISK_GAP`), OU consistência abaixo de `LOW_CONSISTENCY`%,
 *    OU 5+ revisões atrasadas → `MEDIUM`.
 * 6. Caso contrário → `LOW`.
 */
function computeDelayRisk(overview: TrackingOverviewDTO): DelayRiskResult {
  const { examDate, daysUntilExam, planProgressPercent, expectedProgressPercent } = overview.examProgress;

  if (examDate === null || daysUntilExam === null) {
    return {
      risk: "LOW",
      reason: "Sem data de prova definida no plano de estudos — defina uma para calcular o risco de atraso.",
    };
  }

  if (daysUntilExam < 0) {
    return { risk: "HIGH", reason: "A data da prova já passou." };
  }

  const gap =
    planProgressPercent !== null && expectedProgressPercent !== null
      ? planProgressPercent - expectedProgressPercent
      : null;

  if (gap !== null && gap <= HIGH_RISK_GAP) {
    return {
      risk: "HIGH",
      reason: `Progresso do plano ${Math.abs(Math.round(gap))} ponto(s) percentuais abaixo do esperado, com a prova em ${daysUntilExam} dia(s).`,
    };
  }

  if (daysUntilExam <= 7 && gap !== null && gap < 0) {
    return {
      risk: "HIGH",
      reason: `Prova em ${daysUntilExam} dia(s) com o plano ainda atrasado em relação ao esperado.`,
    };
  }

  const lowConsistency = overview.consistency.consistencyPercent < LOW_CONSISTENCY;
  const manyOverdue = overview.overdueReviews.length >= 5;

  if ((gap !== null && gap <= MEDIUM_RISK_GAP) || lowConsistency || manyOverdue) {
    const reason = lowConsistency
      ? `Consistência de estudo (${overview.consistency.consistencyPercent}%) abaixo de ${LOW_CONSISTENCY}% na janela recente.`
      : manyOverdue
        ? `${overview.overdueReviews.length} revisões atrasadas no plano de estudos.`
        : "Progresso do plano levemente abaixo do esperado para a proximidade da prova.";
    return { risk: "MEDIUM", reason };
  }

  return {
    risk: "LOW",
    reason: "Progresso do plano dentro (ou acima) do esperado para a proximidade da prova.",
  };
}

function computeSuggestions(overview: TrackingOverviewDTO, delayRisk: DelayRiskResult): string[] {
  const suggestions: string[] = [];

  if (delayRisk.risk === "HIGH") {
    suggestions.push("Aumente o tempo de estudo nos próximos dias para recuperar o atraso em relação ao plano.");
  } else if (delayRisk.risk === "MEDIUM") {
    suggestions.push("Reserve um horário fixo na próxima semana para reduzir o atraso do plano.");
  }

  if (overview.overdueReviews.length > 0) {
    suggestions.push("Priorize as revisões atrasadas antes de avançar para conteúdo novo.");
  }

  const weakest = [...overview.subjectPerformance]
    .filter((entry) => hasEnoughSample(entry.total) && entry.accuracyPercent < WEAK_THRESHOLD)
    .sort((a, b) => a.accuracyPercent - b.accuracyPercent)[0];
  if (weakest) {
    suggestions.push(`Dedique um bloco extra de questões a ${weakest.subjectName} na próxima semana.`);
  }

  if (!overview.dailyGoal.achieved) {
    suggestions.push("Busque bater a meta diária de pontos para manter o ritmo consistente.");
  }
  if (!overview.weeklyGoal.achieved) {
    suggestions.push("Acompanhe a meta semanal ao longo da semana em vez de deixar para os últimos dias.");
  }

  if (suggestions.length === 0) {
    suggestions.push("Continue com o plano atual — o ritmo está adequado.");
  }

  return suggestions;
}

/**
 * Computa o diagnóstico completo de preparação a partir do `TrackingOverviewDTO` já agregado.
 * PURA: mesma entrada sempre produz a mesma saída (nenhuma leitura de relógio/repositório aqui).
 */
export function computeDiagnosis(overview: TrackingOverviewDTO): DiagnosisDTO {
  const delayRisk = computeDelayRisk(overview);

  return {
    strengths: computeStrengths(overview),
    weaknesses: computeWeaknesses(overview),
    priorities: computePriorities(overview),
    delayRisk: delayRisk.risk,
    delayRiskReason: delayRisk.reason,
    suggestions: computeSuggestions(overview, delayRisk),
  };
}
