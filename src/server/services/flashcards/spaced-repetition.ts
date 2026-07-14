import { SPACED_REPETITION } from "@/config/business";
import type { FlashcardReviewRating } from "@/server/repositories/contracts/flashcard-review-repository";

/**
 * Repetição espaçada — "SM-2 simplificado" (Fase 14 — agente `backend`, CLAUDE.md §19/§25).
 *
 * FUNÇÃO PURA: nenhuma leitura de `Date.now()`/`Math.random()`/repositório aqui dentro — todo
 * "agora" é sempre um parâmetro explícito de quem chama (`@/server/services/flashcards/review-card.ts`),
 * mesma regra aplicada ao resto do projeto (ex.: `study-plan/plan-generator.ts`). Isso é o que
 * torna esta função 100% testável por tabela de entrada/saída (`tests/unit/spaced-repetition.test.ts`).
 *
 * ---------------------------------------------------------------------------------------------
 * ALGORITMO (adaptado do SM-2 clássico — usado pelo SuperMemo — para as 4 classificações do
 * CLAUDE.md §19: Errei/Difícil/Médio/Fácil, em vez da escala 0–5 de qualidade do SM-2 original).
 * ---------------------------------------------------------------------------------------------
 *
 * Estado mantido por `(usuário, cartão)`, uma linha por revisão (`FlashcardReview`, append-only,
 * docs/DATA-MODEL.md): `easeFactor` (fator de facilidade, começa em 2.5), `intervalDays`
 * (intervalo em dias até a próxima revisão, começa em 0 — cartão nunca revisado) e `repetition`
 * (nº de acertos CONSECUTIVOS, começa em 0, zera a cada "Errei").
 *
 * 1. **Errei (AGAIN) — SEMPRE reinicia**, independente do estado anterior:
 *    - `repetition' = 0`
 *    - `easeFactor' = max(MIN_EASE, easeFactor - 0.20)` (penaliza a facilidade)
 *    - `intervalDays' = 1` (revisa de novo já no dia seguinte)
 *
 * 2. **Difícil (HARD) / Médio (GOOD) / Fácil (EASY) — todas "acertos"**, `repetition` avança:
 *    - `repetition' = repetition + 1`
 *    - `easeFactor' = clamp(easeFactor + delta[classificação], MIN_EASE, MAX_EASE)`, onde
 *      `delta = { HARD: -0.15, GOOD: 0, EASY: +0.15 }` — Difícil ainda reduz um pouco a
 *      facilidade (quase errou), Médio mantém, Fácil aumenta (mesmo espírito do SM-2 clássico,
 *      em que só qualidade máxima aumenta o ease factor).
 *    - `intervalDays'` depende de `repetition'` (mesma ideia do SM-2 clássico de ter passos fixos
 *      no início e crescimento multiplicativo depois — aqui, cada classificação tem seus PRÓPRIOS
 *      passos fixos e seu próprio multiplicador, para garantir Fácil > Médio > Difícil em
 *      QUALQUER estado, inclusive no primeiro acerto):
 *      - `repetition' === 1`: passo fixo — `{ HARD: 2, GOOD: 3, EASY: 4 }` dias.
 *      - `repetition' === 2`: passo fixo — `{ HARD: 4, GOOD: 6, EASY: 9 }` dias (o "6 dias" do
 *        Médio casa com o passo clássico do SM-2 na 2ª repetição).
 *      - `repetition' >= 3`: `round(max(intervalDays, 1) * easeFactor' * growthFactor[classificação])`,
 *        nunca menor que 1 dia — onde `growthFactor = { HARD: 0.85, GOOD: 1.0, EASY: 1.3 }`.
 *        A partir daqui, o crescimento vem tanto do `easeFactor'` (que já reflete o HISTÓRICO de
 *        classificações) quanto do multiplicador do PRÓPRIO evento atual — Fácil acelera duas
 *        vezes (ease maior E multiplicador maior), Difícil desacelera duas vezes.
 *
 * Por construção, para o MESMO estado de partida, `intervalDays'(EASY) > intervalDays'(GOOD) >
 * intervalDays'(HARD) > intervalDays'(AGAIN) = 1` sempre (Difícil/Médio "intermediários" entre o
 * reinício de Errei e o maior aumento de Fácil — CLAUDE.md §19).
 *
 * `nextReviewAt = now + intervalDays'` (dias corridos exatos, preservando hora do dia — ver
 * `addIntervalDays` abaixo; nunca truncado à meia-noite UTC, diferente de `study-plan/date-utils.ts`,
 * que é para DATAS DE CALENDÁRIO — aqui é um instante preciso de "daqui a N dias").
 *
 * ---------------------------------------------------------------------------------------------
 * O QUE CONTA COMO "ACERTO" (gamificação + retenção, `isCorrectRating` abaixo)
 * ---------------------------------------------------------------------------------------------
 * Difícil/Médio/Fácil contam como acerto (`FlashcardCorrect`, 5 pontos, CLAUDE.md §15) — só
 * Errei não pontua. Decisão explícita (documentada também em `review-card.ts`): mesmo "Difícil"
 * significa que o aluno LEMBROU a resposta (só achou mais custoso), diferente de "Errei" (não
 * lembrou). Ver `docs/FLASHCARDS.md` para a tabela de exemplos e a decisão anti-farm (o motivo de
 * repetir a MESMA revisão não permitir pontuar de novo não é a `idempotencyKey` sozinha — é o
 * cartão só poder ser revisado de novo quando `nextReviewAt` chega, aplicado em `review-card.ts`).
 *
 * ---------------------------------------------------------------------------------------------
 * EXEMPLO (cartão novo, `{ easeFactor: 2.5, intervalDays: 0, repetition: 0 }`)
 * ---------------------------------------------------------------------------------------------
 * | Classificação | repetition' | easeFactor' | intervalDays' |
 * |----------------|-------------|-------------|----------------|
 * | Errei          | 0           | 2.30        | 1              |
 * | Difícil        | 1           | 2.35        | 2              |
 * | Médio          | 1           | 2.50        | 3              |
 * | Fácil          | 1           | 2.65        | 4              |
 *
 * Encadeando Médio, Médio, Médio a partir do zero: 3 → 6 → round(6*2.5*1.0)=15 dias.
 */

const MIN_EASE = SPACED_REPETITION.minEaseFactor;
const MAX_EASE = SPACED_REPETITION.maxEaseFactor;

export interface SpacedRepetitionState {
  easeFactor: number;
  intervalDays: number;
  repetition: number;
}

function clampEase(value: number): number {
  return Math.min(MAX_EASE, Math.max(MIN_EASE, value));
}

/** `true` para Difícil/Médio/Fácil (o aluno lembrou); `false` só para Errei. */
export function isCorrectRating(rating: FlashcardReviewRating): boolean {
  return rating !== "AGAIN";
}

/**
 * Calcula o próximo estado (`easeFactor`/`intervalDays`/`repetition`) a partir do estado ATUAL
 * (parâmetros da última revisão, ou os defaults de um cartão nunca revisado) e da classificação
 * dada pelo aluno nesta revisão. Ver o algoritmo completo no cabeçalho deste arquivo.
 */
export function computeNextReview(
  state: SpacedRepetitionState,
  rating: FlashcardReviewRating,
): SpacedRepetitionState {
  if (rating === "AGAIN") {
    return {
      repetition: 0,
      easeFactor: clampEase(state.easeFactor + SPACED_REPETITION.easeDelta.AGAIN),
      intervalDays: SPACED_REPETITION.againResetIntervalDays,
    };
  }

  const repetition = state.repetition + 1;
  const easeFactor = clampEase(state.easeFactor + SPACED_REPETITION.easeDelta[rating]);

  let intervalDays: number;
  if (repetition === 1) {
    intervalDays = SPACED_REPETITION.firstIntervalDays[rating];
  } else if (repetition === 2) {
    intervalDays = SPACED_REPETITION.secondIntervalDays[rating];
  } else {
    const previousInterval = Math.max(state.intervalDays, 1);
    intervalDays = Math.max(1, Math.round(previousInterval * easeFactor * SPACED_REPETITION.growthFactor[rating]));
  }

  return { repetition, easeFactor, intervalDays };
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/** Soma `intervalDays` dias corridos EXATOS a `now` (preserva hora/minuto/segundo) — distinto de
 *  `study-plan/date-utils.ts#addDaysIso`, que trunca à meia-noite UTC para datas de CALENDÁRIO;
 *  aqui o resultado é o instante preciso "daqui a N dias" a partir de quando o aluno revisou. */
export function addIntervalDays(now: Date, intervalDays: number): Date {
  return new Date(now.getTime() + intervalDays * DAY_IN_MS);
}

/** Estado default de um cartão nunca revisado por este usuário. */
export const NEW_CARD_STATE: SpacedRepetitionState = {
  easeFactor: SPACED_REPETITION.defaultEaseFactor,
  intervalDays: 0,
  repetition: 0,
};
