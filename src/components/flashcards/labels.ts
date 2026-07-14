import { BookOpen, FileWarning, Frown, Layers, Meh, NotebookText, RotateCcw, Smile, Star, type LucideIcon } from "lucide-react";
import type { FlashcardDeckKind, FlashcardRating } from "@/contracts/flashcards";

/**
 * Rótulos, cores e ícones (pt-BR) da UI de Flashcards (Fase 14 — agente `frontend`). Puramente
 * apresentacional — nenhuma regra de negócio: `FlashcardRating`/`FlashcardDeckKind` já vêm
 * prontos do backend (`@/contracts/flashcards`); estes mapas só traduzem o enum para
 * texto/cor/ícone. Mesmo padrão de `@/components/simulations/labels.ts`
 * (`DIFFICULTY_LABEL`/`DIFFICULTY_BADGE_CLASS`) e `@/components/tracking/labels.ts`.
 *
 * A dificuldade do CARTÃO (`FlashcardDifficulty`) reaproveita `DIFFICULTY_LABEL`/
 * `DIFFICULTY_BADGE_CLASS` de `@/components/simulations/labels` diretamente nos componentes que
 * exibem badge de dificuldade — mesmo conjunto de valores (`EASY | MEDIUM | HARD`, ver
 * `@/contracts/flashcards`, "espelha `Difficulty` do Prisma (mesmos valores de
 * `questionDifficultySchema`)") — evita duplicar o mesmo mapa em dois lugares (CLAUDE.md §6,
 * "evitar duplicação").
 */

/** As 4 classificações de revisão (CLAUDE.md §19), na ordem em que os botões são exibidos — da
 *  pior para a melhor lembrança (Errei -> Difícil -> Médio -> Fácil). Reaproveitada tanto pelos
 *  botões de classificação (`FlashcardFace`) quanto pelo resumo da sessão (`ReviewSession`). */
export const RATING_ORDER: readonly FlashcardRating[] = ["AGAIN", "HARD", "GOOD", "EASY"];

export const RATING_LABEL: Record<FlashcardRating, string> = {
  AGAIN: "Errei",
  HARD: "Difícil",
  GOOD: "Médio",
  EASY: "Fácil",
};

/** Ícone de cada classificação — nunca a única pista (acompanha sempre o rótulo textual acima e
 *  a cor abaixo), reforço extra além do já exigido por CLAUDE.md §22 ("não depender só de cor"). */
export const RATING_ICON: Record<FlashcardRating, LucideIcon> = {
  AGAIN: RotateCcw,
  HARD: Frown,
  GOOD: Meh,
  EASY: Smile,
};

/**
 * Cor de cada botão de classificação — paleta restrita do projeto (CLAUDE.md §21): vermelho para
 * Errei (erro), verde para Fácil (acerto/melhor caso), amarelo/primary (destaque — "quase
 * esqueceu") para Difícil e neutro para Médio (caso comum, sem ênfase). A cor nunca é a única
 * pista — o rótulo textual (`RATING_LABEL`) e o ícone (`RATING_ICON`) sempre acompanham.
 */
export const RATING_BUTTON_CLASS: Record<FlashcardRating, string> = {
  AGAIN: "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20",
  HARD: "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20",
  GOOD: "border-border bg-muted text-foreground hover:bg-muted/70",
  EASY: "border-success/40 bg-success/10 text-success hover:bg-success/20",
};

/** Ordem de exibição dos grupos de baralho — espelha `TYPE_ORDER` de
 *  `@/server/services/flashcards/list-decks.ts` (Favoritos em destaque primeiro, depois matéria,
 *  pessoais, erros e anotações por último). `DeckDTO[]` já chega ORDENADO nesta sequência pelo
 *  backend; esta constante só existe para AGRUPAR por seção (nunca reordenar). */
export const DECK_TYPE_ORDER: readonly FlashcardDeckKind[] = ["FAVORITES", "SUBJECT", "PERSONAL", "ERRORS", "NOTES"];

export const DECK_TYPE_LABEL: Record<FlashcardDeckKind, string> = {
  SUBJECT: "Matérias",
  PERSONAL: "Personalizados",
  ERRORS: "Criados de erros",
  NOTES: "Criados de anotações",
  FAVORITES: "Favoritos",
};

export const DECK_TYPE_DESCRIPTION: Record<FlashcardDeckKind, string> = {
  SUBJECT: "Baralhos oficiais do curso, organizados por matéria.",
  PERSONAL: "Baralhos que você criou.",
  ERRORS: "Gerado automaticamente a partir do seu caderno de erros de simulados.",
  NOTES: "Gerado automaticamente a partir das suas anotações no Brainstorm.",
  FAVORITES: "Cartões marcados como favoritos, de qualquer baralho acessível.",
};

export const DECK_TYPE_ICON: Record<FlashcardDeckKind, LucideIcon> = {
  SUBJECT: BookOpen,
  PERSONAL: Layers,
  ERRORS: FileWarning,
  NOTES: NotebookText,
  FAVORITES: Star,
};

/**
 * Plural de "cartão" (pt-BR) — IRREGULAR ("ão" -> "ões", nunca só "+s"/"+es": "cartãos"/"cartãoes"
 * não existem em português). Centralizado aqui em vez de repetir `count === 1 ? "cartão" :
 * "cartões"` em cada componente (`DeckCard`/`ReviewSession`/`FlashcardsWorkspace`).
 */
export function pluralizeCartao(count: number): string {
  return count === 1 ? "cartão" : "cartões";
}
