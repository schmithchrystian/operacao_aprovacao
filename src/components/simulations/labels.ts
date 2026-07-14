import type { AttemptStatus, QuestionDifficultyInput } from "@/contracts/simulations";

/**
 * Rótulos e variantes de exibição (pt-BR) para os enums de simulados. Puramente apresentacional
 * — nenhuma regra de negócio, só tradução de um valor que já vem pronto do backend.
 */

export const DIFFICULTY_LABEL: Record<QuestionDifficultyInput, string> = {
  EASY: "Fácil",
  MEDIUM: "Médio",
  HARD: "Difícil",
};

export const DIFFICULTY_BADGE_CLASS: Record<QuestionDifficultyInput, string> = {
  EASY: "border-success/40 bg-success/10 text-success",
  MEDIUM: "border-primary/40 bg-primary/10 text-primary",
  HARD: "border-destructive/40 bg-destructive/10 text-destructive",
};

export const ATTEMPT_STATUS_LABEL: Record<AttemptStatus, string> = {
  IN_PROGRESS: "Em andamento",
  FINISHED: "Finalizado",
  EXPIRED: "Expirado",
  CANCELLED: "Cancelado",
};

export const ATTEMPT_STATUS_BADGE_CLASS: Record<AttemptStatus, string> = {
  IN_PROGRESS: "border-primary/40 bg-primary/10 text-primary",
  FINISHED: "border-success/40 bg-success/10 text-success",
  EXPIRED: "border-destructive/40 bg-destructive/10 text-destructive",
  CANCELLED: "border-border bg-muted text-muted-foreground",
};

/** Formata segundos como "Xh Ymin Zs" (ou "Ymin Zs"/"Zs"), só para exibição. */
export function formatSecondsAsDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}min`);
  parts.push(`${seconds}s`);
  return parts.join(" ");
}

/** "mm:ss" (ou "h:mm:ss" acima de 1h) — usado pelo timer da resolução do simulado. */
export function formatSecondsAsClock(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const mm = minutes.toString().padStart(hours > 0 ? 2 : 1, "0");
  const ss = seconds.toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
