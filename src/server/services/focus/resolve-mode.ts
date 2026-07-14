import { FOCUS, FOCUS_MODE_DURATIONS } from "@/config/business";
import type { PomodoroConfigInput } from "@/contracts/focus";

export interface ResolvedFocusDurations {
  /** `0` no modo `free` — sinal de "sem alvo fixo" (cronômetro progressivo). */
  targetSeconds: number;
  breakSeconds: number;
}

/**
 * Resolve a duração de foco/pausa (segundos) a partir do modo escolhido — PURO, sem I/O.
 *
 * `free`: sem alvo fixo (cronômetro livre, contagem progressiva) — `targetSeconds = 0`; a
 * duração mínima para pontuar (`finishFocusSession`) usa `FOCUS.freeModeMinScoringMinutes` em
 * vez de uma fração do alvo (não há alvo do qual tirar fração).
 *
 * `custom`: usa os minutos informados pelo aluno — já validados pelos limites de `FOCUS`
 * (`customMinFocusMinutes`/`customMaxFocusMinutes`) no contrato Zod (`@/contracts/focus`); o
 * fallback abaixo só existe para satisfazer o tipo (nunca deveria ser exercido em produção,
 * porque o Zod já rejeita `mode: "custom"` sem `customFocusMinutes` antes de chegar aqui).
 */
export function resolveFocusModeDurations(
  input: Pick<PomodoroConfigInput, "mode" | "customFocusMinutes" | "customBreakMinutes">,
): ResolvedFocusDurations {
  if (input.mode === "free") {
    return { targetSeconds: 0, breakSeconds: 0 };
  }

  if (input.mode === "custom") {
    const focusMinutes = input.customFocusMinutes ?? FOCUS.customMinFocusMinutes;
    const breakMinutes = input.customBreakMinutes ?? 0;
    return { targetSeconds: focusMinutes * 60, breakSeconds: breakMinutes * 60 };
  }

  const preset = FOCUS_MODE_DURATIONS[input.mode];
  return { targetSeconds: preset.focusMinutes * 60, breakSeconds: preset.breakMinutes * 60 };
}
