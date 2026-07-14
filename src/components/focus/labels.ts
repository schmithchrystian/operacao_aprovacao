import { Clock, Flame, Infinity as InfinityIcon, SlidersHorizontal, Timer, Zap, type LucideIcon } from "lucide-react";
import { FOCUS_MODE_DURATIONS } from "@/config/business";
import type { FocusMode } from "@/contracts/focus";

/**
 * Rótulos, dicas e ícones (pt-BR) dos modos de Modo Foco/Pomodoro (Fase 15 — UI). Puramente
 * apresentacional — as durações de foco/pausa exibidas vêm de `FOCUS_MODE_DURATIONS`
 * (`@/config/business`), a MESMA fonte usada por `resolveFocusModeDurations` no servidor
 * (`@/server/services/focus/resolve-mode.ts`), nunca um número reescrito à mão aqui.
 */
export const FOCUS_MODE_LABEL: Record<FocusMode, string> = {
  "25_5": "Pomodoro clássico",
  "50_10": "Pomodoro longo",
  quick_15: "Sessão rápida",
  intense_90: "Sessão intensa",
  free: "Cronômetro livre",
  custom: "Personalizado",
};

function presetHint(mode: keyof typeof FOCUS_MODE_DURATIONS): string {
  const { focusMinutes, breakMinutes } = FOCUS_MODE_DURATIONS[mode];
  return `${focusMinutes} min de foco + ${breakMinutes} min de pausa`;
}

export const FOCUS_MODE_HINT: Record<FocusMode, string> = {
  "25_5": presetHint("25_5"),
  "50_10": presetHint("50_10"),
  quick_15: presetHint("quick_15"),
  intense_90: presetHint("intense_90"),
  free: "Sem alvo fixo — conta o tempo e você encerra quando quiser",
  custom: "Escolha seus próprios minutos de foco e de pausa",
};

export const FOCUS_MODE_ICON: Record<FocusMode, LucideIcon> = {
  "25_5": Timer,
  "50_10": Clock,
  quick_15: Zap,
  intense_90: Flame,
  free: InfinityIcon,
  custom: SlidersHorizontal,
};

/** Autoavaliação de nível de foco (1-5) do formulário de encerramento — só informativo
 *  (`FinishFocusInput.focusLevel`, `@/contracts/focus`), nunca usado para decidir pontuação. */
export const FOCUS_LEVEL_OPTIONS = [1, 2, 3, 4, 5] as const;

export const FOCUS_LEVEL_LABEL: Record<(typeof FOCUS_LEVEL_OPTIONS)[number], string> = {
  1: "Muito disperso",
  2: "Disperso",
  3: "Neutro",
  4: "Focado",
  5: "Muito focado",
};

/** Type guard para indexar `FOCUS_LEVEL_LABEL` a partir de um `number` genérico (ex.: valor de
 *  formulário já validado pelo Zod, mas cujo tipo inferido é `number` e não o união literal
 *  `1|2|3|4|5`) sem recorrer a `any`/asserção insegura. */
export function isFocusLevel(value: number): value is (typeof FOCUS_LEVEL_OPTIONS)[number] {
  return (FOCUS_LEVEL_OPTIONS as readonly number[]).includes(value);
}

/**
 * Estratégia de anúncio "moderado" para leitores de tela (aria-live) — mesmo espírito de
 * `shouldAnnounce` em `@/components/simulations/attempt-timer.tsx`: marcos de minuto sempre, e a
 * cada 10s no último minuto de uma contagem regressiva COM alvo. No cronômetro livre (`hasTarget
 * = false`, modo `free`) não existe "último minuto" — a contagem cresce sem fim —, então só os
 * marcos de minuto se aplicam.
 */
export function shouldAnnounceFocusMark(seconds: number, hasTarget: boolean): boolean {
  if (hasTarget && seconds <= 0) return true;
  if (hasTarget && seconds <= 60) return seconds % 10 === 0;
  return seconds % 60 === 0;
}
