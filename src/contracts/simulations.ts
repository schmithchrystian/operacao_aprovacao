import { z } from "zod";
import { idSchema } from "./common";

/**
 * Contratos do domínio de simulados (Fase 10 — agente `simulations`, CLAUDE.md §18/§25).
 *
 * FRONTEIRA DE DOMÍNIO MAIS CRÍTICA DA PLATAFORMA (docs/ARCHITECTURE.md §5): a resposta
 * correta (`QuestionOption.isCorrect`) NUNCA aparece em um DTO consumido ANTES da correção.
 * `AttemptQuestionDTO`/`AttemptDTO` (tentativa em andamento) simplesmente NÃO TÊM esse campo —
 * não é "omitido na serialização", é estruturalmente inexistente no tipo. Só
 * `QuestionResultDTO`/`AttemptResultDTO` (tentativa já `FINISHED`) o expõem.
 *
 * `SubmitAnswersInput` também é uma fronteira dura: o cliente envia SÓ `{ attemptId, answers:
 * [{questionId, selectedOptionId}] }` — nunca nota, acertos, pontos ou tempo decorrido. Zod
 * descarta silenciosamente qualquer campo extra não declarado no schema (ex.: um `scorePercent`
 * forjado), então mesmo um payload adulterado não consegue influenciar a correção — o serviço
 * (`src/server/services/simulations`) recalcula tudo a partir de `QuestionOption.isCorrect` e do
 * relógio do servidor.
 */

/** Espelha `Difficulty` do Prisma (`docs/DATA-MODEL.md`). */
export const questionDifficultySchema = z.enum(["EASY", "MEDIUM", "HARD"]);
export type QuestionDifficultyInput = z.infer<typeof questionDifficultySchema>;

/** Espelha `MockExamAttemptStatus` do Prisma. */
export const attemptStatusSchema = z.enum(["IN_PROGRESS", "FINISHED", "EXPIRED", "CANCELLED"]);
export type AttemptStatus = z.infer<typeof attemptStatusSchema>;

/**
 * Modo de seleção de questões para um simulado PERSONALIZADO (filtro por matéria/assunto/
 * banca/dificuldade, sem um `mockExamId` de catálogo):
 * - `RANDOM`: questões aleatórias que atendam ao filtro;
 * - `WRONG_ONLY`: só questões que o aluno já errou antes (caderno de erros);
 * - `NEW_ONLY`: só questões que o aluno nunca respondeu.
 * Ignorado quando `mockExamId` é informado (usa o conjunto fixo do simulado de catálogo).
 */
export const mockExamModeSchema = z.enum(["RANDOM", "WRONG_ONLY", "NEW_ONLY"]);
export type MockExamMode = z.infer<typeof mockExamModeSchema>;

/**
 * Entrada de `createAttemptAction`/`createAttempt`. `userId` NUNCA faz parte deste contrato —
 * é sempre resolvido a partir da sessão autenticada no service (ADR-0006).
 *
 * Dois caminhos, mutuamente complementares:
 * 1. `mockExamId` informado → "simulado completo" de catálogo: usa o conjunto de questões
 *    fixo do simulado (demais filtros de conteúdo são ignorados; `mode` não se aplica).
 * 2. `mockExamId` ausente → "simulado por matéria/personalizado": o service resolve as
 *    questões a partir dos filtros (concurso → curso → matéria/assunto/banca/dificuldade) e do
 *    `mode`, monta um `MockExam` ad-hoc e cria a tentativa sobre ele.
 */
export const mockExamConfigInputSchema = z.object({
  mockExamId: idSchema.optional(),
  /** Filtra pelas matérias ensinadas nos cursos do concurso (resolvido via `Course`/`Module`). */
  contestId: idSchema.optional(),
  /** Filtra pelas matérias ensinadas nos módulos do curso (resolvido via `Module`). */
  courseId: idSchema.optional(),
  subjectId: idSchema.optional(),
  topicId: idSchema.optional(),
  board: z.string().min(1).max(120).optional(),
  difficulty: questionDifficultySchema.optional(),
  quantity: z.coerce.number().int().min(1).max(120).default(10),
  /** Minutos. Ausente = sem limite de tempo (ou, com `mockExamId`, usa `MockExam.durationMinutes`). */
  timeLimitMinutes: z.coerce.number().int().min(1).max(600).optional(),
  mode: mockExamModeSchema.default("RANDOM"),
});
export type MockExamConfigInput = z.infer<typeof mockExamConfigInputSchema>;

/** Alternativa exibida DURANTE a tentativa — nunca `isCorrect`. */
export const attemptQuestionOptionDTOSchema = z.object({
  id: idSchema,
  label: z.string().min(1),
  text: z.string().min(1),
});
export type AttemptQuestionOptionDTO = z.infer<typeof attemptQuestionOptionDTOSchema>;

/**
 * Questão exibida DURANTE a tentativa (`IN_PROGRESS`) — enunciado + alternativas SEM
 * `isCorrect` e SEM `explanation` (liberada só após a correção, `QuestionResultDTO`).
 */
export const attemptQuestionDTOSchema = z.object({
  questionId: idSchema,
  statement: z.string().min(1),
  subjectName: z.string().min(1),
  topicName: z.string().nullable(),
  board: z.string().nullable(),
  difficulty: questionDifficultySchema,
  /** Ordem embaralhada de forma determinística por `(attemptId, questionId)` — preserva
   *  rastreabilidade (cada alternativa mantém seu `id` real; só a posição de exibição muda). */
  options: z.array(attemptQuestionOptionDTOSchema),
});
export type AttemptQuestionDTO = z.infer<typeof attemptQuestionDTOSchema>;

/** Tentativa em andamento (ou recém-criada) — nunca contém gabarito. */
export const attemptDTOSchema = z.object({
  id: idSchema,
  mockExamId: idSchema,
  mockExamTitle: z.string().nullable(),
  status: attemptStatusSchema,
  /** ISO 8601 — registrado pelo servidor. */
  startedAt: z.string().min(1),
  /** Segundos, ou `null` = sem limite. */
  timeLimitSeconds: z.number().int().min(0).nullable(),
  /** Calculado no servidor NO MOMENTO da resposta (`timeLimitSeconds - decorrido`); nunca um
   *  cronômetro que o cliente possa adulterar — só um valor informativo para exibição. */
  remainingSeconds: z.number().int().min(0).nullable(),
  questions: z.array(attemptQuestionDTOSchema),
});
export type AttemptDTO = z.infer<typeof attemptDTOSchema>;

/**
 * Metadados de STATUS de uma tentativa — SEM questões e SEM gabarito. Serve para as telas
 * decidirem o roteamento por status EXPLÍCITO (evitando o loop de redirect quando uma tentativa
 * está em estado terminal EXPIRED/CANCELLED — achado de segurança Fase 10 — MÉDIO): a página de
 * resolução e a de resultado consultam o status real em vez de redirecionar uma para a outra às
 * cegas em cima de um `CONFLICT`. Seguro para exibir num estado terminal (não expõe conteúdo de
 * questão nem `isCorrect`).
 */
export const attemptStatusDTOSchema = z.object({
  attemptId: idSchema,
  mockExamId: idSchema,
  mockExamTitle: z.string().nullable(),
  status: attemptStatusSchema,
  startedAt: z.string().min(1),
  finishedAt: z.string().nullable(),
  totalQuestions: z.number().int().min(0),
});
export type AttemptStatusDTO = z.infer<typeof attemptStatusDTOSchema>;

/** Uma resposta enviada pelo cliente. `selectedOptionId: null` = questão deixada em branco. */
export const submitAnswerInputSchema = z.object({
  questionId: idSchema,
  selectedOptionId: idSchema.nullable(),
});
export type SubmitAnswerInput = z.infer<typeof submitAnswerInputSchema>;

/**
 * Entrada de `submitAttemptAction`/`submitAndFinalize` — EXATAMENTE o formato exigido por
 * CLAUDE.md/docs/ARCHITECTURE.md §5: `{ attemptId, answers: [{questionId, selectedOptionId}] }`.
 * Nenhum campo de nota, acerto, pontuação ou tempo decorrido existe aqui — mesmo que o cliente
 * envie esses campos no corpo bruto da requisição, o Zod os descarta antes do service ver o
 * valor (`z.object` sem `.passthrough()`).
 */
export const submitAnswersInputSchema = z.object({
  attemptId: idSchema,
  answers: z.array(submitAnswerInputSchema).max(120),
});
export type SubmitAnswersInput = z.infer<typeof submitAnswersInputSchema>;

/** Alternativa exibida PÓS-correção — agora com `isCorrect` liberado. */
export const resultOptionDTOSchema = z.object({
  id: idSchema,
  label: z.string().min(1),
  text: z.string().min(1),
  isCorrect: z.boolean(),
});
export type ResultOptionDTO = z.infer<typeof resultOptionDTOSchema>;

/** Questão corrigida — gabarito e explicação liberados (tentativa já `FINISHED`). */
export const questionResultDTOSchema = z.object({
  questionId: idSchema,
  statement: z.string().min(1),
  subjectName: z.string().min(1),
  topicName: z.string().nullable(),
  board: z.string().nullable(),
  difficulty: questionDifficultySchema,
  options: z.array(resultOptionDTOSchema),
  selectedOptionId: idSchema.nullable(),
  /** `null` = não respondida (não confundir com `false` = respondida errada). */
  isCorrect: z.boolean().nullable(),
  explanation: z.string().nullable(),
});
export type QuestionResultDTO = z.infer<typeof questionResultDTOSchema>;

export const subjectPerformanceDTOSchema = z.object({
  subjectId: idSchema,
  subjectName: z.string().min(1),
  total: z.number().int().min(0),
  correct: z.number().int().min(0),
  accuracyPercent: z.number().min(0).max(100),
});
export type SubjectPerformanceDTO = z.infer<typeof subjectPerformanceDTOSchema>;

export const topicPerformanceDTOSchema = z.object({
  topicId: idSchema,
  topicName: z.string().min(1),
  subjectId: idSchema,
  total: z.number().int().min(0),
  correct: z.number().int().min(0),
  accuracyPercent: z.number().min(0).max(100),
});
export type TopicPerformanceDTO = z.infer<typeof topicPerformanceDTOSchema>;

/**
 * Resultado da tentativa PÓS-correção — nota/acertos/pontos SEMPRE calculados no servidor
 * (`submitAndFinalize`); nunca aceitos de um valor do cliente (CLAUDE.md §18/§25).
 */
export const attemptResultDTOSchema = z.object({
  attemptId: idSchema,
  mockExamId: idSchema,
  mockExamTitle: z.string().nullable(),
  status: attemptStatusSchema,
  startedAt: z.string().min(1),
  finishedAt: z.string().min(1),
  timeSpentSeconds: z.number().int().min(0),
  totalQuestions: z.number().int().min(0),
  correctCount: z.number().int().min(0),
  wrongCount: z.number().int().min(0),
  blankCount: z.number().int().min(0),
  /** Percentual 0–100 (convenção de escala, docs/DATA-MODEL.md). */
  scorePercent: z.number().min(0).max(100),
  /** Pontos/XP creditados por esta tentativa (lidos do ledger de gamificação — nunca somados a
   *  partir de um valor do cliente). */
  points: z.number().int().min(0),
  xp: z.number().int().min(0),
  bySubject: z.array(subjectPerformanceDTOSchema),
  byTopic: z.array(topicPerformanceDTOSchema),
  /** Nota da tentativa FINALIZADA anterior no mesmo simulado (mesmo `mockExamId`), quando existir. */
  previousAttemptScorePercent: z.number().min(0).max(100).nullable(),
  /** `scorePercent - previousAttemptScorePercent`; `null` quando não há tentativa anterior. */
  evolutionPercent: z.number().nullable(),
  suggestions: z.array(z.string().min(1)),
  questions: z.array(questionResultDTOSchema),
});
export type AttemptResultDTO = z.infer<typeof attemptResultDTOSchema>;

/** Item do caderno de erros — uma linha por questão já errada ao menos uma vez. */
export const errorNotebookItemDTOSchema = z.object({
  questionId: idSchema,
  statement: z.string().min(1),
  subjectName: z.string().min(1),
  topicName: z.string().nullable(),
  board: z.string().nullable(),
  difficulty: questionDifficultySchema,
  explanation: z.string().nullable(),
  wrongCount: z.number().int().min(1),
  lastAnsweredAt: z.string().min(1),
  isFavorite: z.boolean(),
});
export type ErrorNotebookItemDTO = z.infer<typeof errorNotebookItemDTOSchema>;

export const errorNotebookDTOSchema = z.array(errorNotebookItemDTOSchema);
export type ErrorNotebookDTO = z.infer<typeof errorNotebookDTOSchema>;

/** Item de histórico — uma linha por tentativa (qualquer status). */
export const historyItemDTOSchema = z.object({
  attemptId: idSchema,
  mockExamId: idSchema,
  mockExamTitle: z.string().nullable(),
  status: attemptStatusSchema,
  startedAt: z.string().min(1),
  finishedAt: z.string().nullable(),
  totalQuestions: z.number().int().min(0),
  correctCount: z.number().int().min(0).nullable(),
  scorePercent: z.number().min(0).max(100).nullable(),
});
export type HistoryItemDTO = z.infer<typeof historyItemDTOSchema>;

/** Questão favoritada (listagem — sem estatística de erro). */
export const favoriteQuestionDTOSchema = z.object({
  questionId: idSchema,
  statement: z.string().min(1),
  subjectName: z.string().min(1),
  topicName: z.string().nullable(),
  board: z.string().nullable(),
  difficulty: questionDifficultySchema,
});
export type FavoriteQuestionDTO = z.infer<typeof favoriteQuestionDTOSchema>;

export const toggleFavoriteInputSchema = z.object({ questionId: idSchema });
export type ToggleFavoriteInput = z.infer<typeof toggleFavoriteInputSchema>;

export const favoriteResultDTOSchema = z.object({ questionId: idSchema, isFavorite: z.boolean() });
export type FavoriteResultDTO = z.infer<typeof favoriteResultDTOSchema>;

/** Entrada de `getAttemptAction`/`getResultAction`. */
export const attemptIdInputSchema = z.object({ attemptId: idSchema });
export type AttemptIdInput = z.infer<typeof attemptIdInputSchema>;

/**
 * Leituras de catálogo (Fase 10 — UI do agente `frontend`) para popular os filtros/listas do
 * formulário de montagem de simulado. Puramente de apresentação — nenhum destes DTOs carrega
 * gabarito/questionIds; só o suficiente para o aluno escolher concurso/curso/matéria/assunto ou
 * um simulado pronto do catálogo. Mesmo padrão de `CourseSummaryDTO` (`@/contracts/courses`):
 * dado público, sem vínculo com um usuário específico.
 */

/** Simulado pronto do catálogo (publicado) — "completo" ou "por matéria" pré-montado. */
export const mockExamCatalogItemDTOSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  description: z.string().nullable(),
  durationMinutes: z.number().int().min(0),
  questionCount: z.number().int().min(0),
});
export type MockExamCatalogItemDTO = z.infer<typeof mockExamCatalogItemDTOSchema>;

/** Opção de matéria para o filtro "matéria" do simulado personalizado. */
export const subjectOptionDTOSchema = z.object({ id: idSchema, name: z.string().min(1) });
export type SubjectOptionDTO = z.infer<typeof subjectOptionDTOSchema>;

/** Opção de assunto (sempre dependente de uma matéria) para o filtro "assunto". */
export const topicOptionDTOSchema = z.object({ id: idSchema, subjectId: idSchema, name: z.string().min(1) });
export type TopicOptionDTO = z.infer<typeof topicOptionDTOSchema>;

/** Entrada de `listTopicOptionsAction`. */
export const listTopicOptionsInputSchema = z.object({ subjectId: idSchema });
export type ListTopicOptionsInput = z.infer<typeof listTopicOptionsInputSchema>;
