import { z } from "zod";
import { idSchema } from "./common";

/**
 * Contratos do domínio de Flashcards / repetição espaçada (Fase 14 — agente `backend`,
 * CLAUDE.md §19/§25). Persistência real já modelada pelo agente `database`
 * (`FlashcardDeck`/`Flashcard`/`FlashcardReview`, docs/DATA-MODEL.md, "Flashcards") — aqui só
 * os DTOs/entradas consumidos por services (`src/server/services/flashcards`) e actions
 * (`src/server/actions/flashcards.ts`).
 *
 * O algoritmo de repetição espaçada em si (fórmula/limiares/exemplos) está documentado no
 * cabeçalho de `@/server/services/flashcards/spaced-repetition.ts` e em `docs/FLASHCARDS.md` —
 * aqui só o FORMATO dos dados.
 */

/** Espelha `FlashcardReviewRating` do Prisma. Errei/Difícil/Médio/Fácil (CLAUDE.md §19). */
export const flashcardRatingSchema = z.enum(["AGAIN", "HARD", "GOOD", "EASY"]);
export type FlashcardRating = z.infer<typeof flashcardRatingSchema>;

/** Espelha `Difficulty` do Prisma (mesmos valores de `questionDifficultySchema`, `@/contracts/simulations`). */
export const flashcardDifficultySchema = z.enum(["EASY", "MEDIUM", "HARD"]);
export type FlashcardDifficulty = z.infer<typeof flashcardDifficultySchema>;

/**
 * Tipo/agrupamento de baralho exibido ao aluno. CAMPO DE APLICAÇÃO para SUBJECT/PERSONAL/
 * ERRORS/NOTES — `FlashcardDeck` no schema Prisma (docs/DATA-MODEL.md) ainda não tem uma coluna
 * própria para distinguir "personalizado" de "criado do caderno de erros"/"criado de
 * anotações" (todos são baralhos com `userId` preenchido) — ver `FlashcardDeckEntity.kind`
 * (mesma divergência já documentada em `StudyPlanItemEntity.kind`/`BrainstormCardEntity.type`,
 * pendência para o agente `database` avaliar numa migration futura).
 *
 * `FAVORITES` NUNCA é o `kind` real de um `FlashcardDeck` — é sintetizado por `listDecks`
 * (agregando cartões favoritados de QUALQUER baralho acessível, `@/server/services/flashcards`),
 * porque favoritar é uma relação por (usuário, cartão) independente de qual baralho contém o
 * cartão (um cartão nunca muda de baralho ao ser favoritado).
 */
export const flashcardDeckKindSchema = z.enum(["SUBJECT", "PERSONAL", "ERRORS", "NOTES", "FAVORITES"]);
export type FlashcardDeckKind = z.infer<typeof flashcardDeckKindSchema>;

/**
 * Cartão pronto para exibição/revisão. `nextReviewAt: null` = nunca revisado (devido
 * imediatamente — `isDue` sempre `true` nesse caso). `tags` NUNCA inclui as marcações internas
 * de origem (`src:error:*`/`src:note:*`, ver `@/server/services/flashcards/shared.ts`) — essas
 * são filtradas antes de chegar aqui; só tags genuinamente definidas pelo aluno/conteúdo.
 */
export const flashcardDTOSchema = z.object({
  id: idSchema,
  deckId: idSchema,
  deckTitle: z.string().min(1),
  question: z.string().min(1),
  answer: z.string().min(1),
  subjectId: idSchema.nullable(),
  subjectName: z.string().nullable(),
  topicId: idSchema.nullable(),
  topicName: z.string().nullable(),
  difficulty: flashcardDifficultySchema,
  tags: z.array(z.string()),
  isFavorite: z.boolean(),
  /** ISO 8601 — data da última revisão, ou `null` se nunca revisado. */
  lastReviewedAt: z.string().nullable(),
  /** ISO 8601 — próxima revisão devida, ou `null` se nunca revisado. */
  nextReviewAt: z.string().nullable(),
  intervalDays: z.number().int().min(0),
  easeFactor: z.number(),
  repetition: z.number().int().min(0),
  /** Derivado: `nextReviewAt === null || nextReviewAt <= now` no momento da consulta. */
  isDue: z.boolean(),
  createdAt: z.string(),
});
export type FlashcardDTO = z.infer<typeof flashcardDTOSchema>;

/** Baralho com contagem total e contagem de cartões devidos (`due count`) PARA O USUÁRIO atual —
 *  mesmo um baralho de matéria (público/compartilhado) tem `dueCount` calculado pelo histórico
 *  de revisão DESTE usuário, nunca um valor global compartilhado entre alunos. */
export const deckDTOSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  type: flashcardDeckKindSchema,
  subjectId: idSchema.nullable(),
  subjectName: z.string().nullable(),
  cardCount: z.number().int().min(0),
  dueCount: z.number().int().min(0),
});
export type DeckDTO = z.infer<typeof deckDTOSchema>;

/** Sessão de revisão: cartões devidos, já ordenados por prioridade (mais atrasado primeiro —
 *  ver `@/server/services/flashcards/shared.ts#dueSince`). `cards.length` pode ser menor que
 *  `totalDue` quando o total excede `SPACED_REPETITION.sessionMaxCards` (`@/config/business`). */
export const reviewSessionDTOSchema = z.object({
  deckId: idSchema.nullable(),
  cards: z.array(flashcardDTOSchema),
  totalDue: z.number().int().min(0),
});
export type ReviewSessionDTO = z.infer<typeof reviewSessionDTOSchema>;

/** Estatísticas de retenção do aluno (`getRetentionStats`) — agregado histórico, não por baralho. */
export const retentionStatsDTOSchema = z.object({
  totalCards: z.number().int().min(0),
  cardsReviewedAtLeastOnce: z.number().int().min(0),
  totalReviews: z.number().int().min(0),
  /** Revisões classificadas como Difícil/Médio/Fácil (`isCorrectRating`, ver spaced-repetition.ts). */
  correctReviews: z.number().int().min(0),
  /** `correctReviews / totalReviews * 100`, 2 casas decimais; `0` quando `totalReviews === 0`. */
  retentionPercent: z.number().min(0).max(100),
  dueNowCount: z.number().int().min(0),
});
export type RetentionStatsDTO = z.infer<typeof retentionStatsDTOSchema>;

// ---------------------------------------------------------------------------
// Entradas
// ---------------------------------------------------------------------------

/** Entrada de `createDeckAction`. Baralho pessoal (`kind: "PERSONAL"`) — os baralhos de
 *  matéria/erros/anotações não são criados por esta entrada (o de matéria é conteúdo do
 *  sistema; erros/anotações são auto-provisionados por `createFromErrors`/`createFromNotes`). */
export const createDeckInputSchema = z.object({
  title: z.string().trim().min(1, "Informe um título.").max(120, "Título muito longo."),
  subjectId: idSchema.optional(),
});
export type CreateDeckInput = z.infer<typeof createDeckInputSchema>;

/**
 * Prefixo reservado para as marcações INTERNAS de proveniência de cartões auto-importados
 * (`src:error:<questionId>` / `src:note:<draftId>`, ver
 * `@/server/services/flashcards/shared.ts`). O aluno NUNCA pode enviar uma tag nesse namespace:
 * forjar `src:error:*`/`src:note:*` no próprio baralho quebraria a idempotência das importações
 * (`createFromErrors`/`createFromNotes` detectam "já importado" por essa tag). Achado de segurança
 * B1 (baixo): descartamos silenciosamente qualquer tag com esse prefixo na fronteira de entrada,
 * antes de o serviço ver o valor (não é erro de validação — só não deixamos a tag reservada
 * entrar; as importações do sistema escrevem essas tags direto no repositório, sem passar por
 * este schema).
 */
const RESERVED_TAG_PREFIX = "src:";

const flashcardTagsSchema = z
  .array(z.string().trim().min(1).max(40, "Tag muito longa."))
  .max(20, "Muitas tags.")
  .transform((tags) => tags.filter((tag) => !tag.toLowerCase().startsWith(RESERVED_TAG_PREFIX)));

/** Entrada de `createCardAction`. `deckId` deve ser um baralho PRÓPRIO do aluno (nunca um
 *  baralho de matéria/sistema — validado no serviço, anti-IDOR). */
export const createFlashcardInputSchema = z.object({
  deckId: idSchema,
  question: z.string().trim().min(1, "Informe a pergunta.").max(2000, "Pergunta muito longa."),
  answer: z.string().trim().min(1, "Informe a resposta.").max(4000, "Resposta muito longa."),
  subjectId: idSchema.optional(),
  topicId: idSchema.optional(),
  difficulty: flashcardDifficultySchema.default("MEDIUM"),
  tags: flashcardTagsSchema.default([]),
});
export type CreateFlashcardInput = z.infer<typeof createFlashcardInputSchema>;

/** Entrada de `reviewCardAction` — só o id do cartão e a classificação; `userId` é sempre
 *  resolvido da sessão (ADR-0006), nunca do cliente. */
export const reviewCardInputSchema = z.object({
  flashcardId: idSchema,
  rating: flashcardRatingSchema,
});
export type ReviewCardInput = z.infer<typeof reviewCardInputSchema>;

/** Resultado de `toggleFavoriteAction`. Nome prefixado com `Flashcard` para não colidir com
 *  `favoriteResultDTOSchema`/`FavoriteResultDTO` de questões (`@/contracts/simulations`,
 *  reexportados juntos pelo barrel `@/contracts`). */
export const flashcardFavoriteResultDTOSchema = z.object({ flashcardId: idSchema, isFavorite: z.boolean() });
export type FlashcardFavoriteResultDTO = z.infer<typeof flashcardFavoriteResultDTOSchema>;

/** Entrada de `toggleFavoriteAction` — só o id do cartão (dono/acesso resolvido no serviço).
 *  Distinto de `cardIdInputSchema` (`@/contracts/brainstorm`, cartão Kanban). */
export const flashcardIdInputSchema = z.object({ flashcardId: idSchema });
export type FlashcardIdInput = z.infer<typeof flashcardIdInputSchema>;

/** Entrada de `getReviewSessionAction` — `deckId` omitido = sessão agregando TODOS os baralhos
 *  acessíveis (matéria + pessoais) do aluno. */
export const getReviewSessionInputSchema = z.object({ deckId: idSchema.optional() });
export type GetReviewSessionInput = z.infer<typeof getReviewSessionInputSchema>;
