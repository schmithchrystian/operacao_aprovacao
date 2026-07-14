import type { BrainstormBoardEntity } from "@/server/repositories/contracts/brainstorm-board-repository";
import type { BrainstormCardEntity } from "@/server/repositories/contracts/brainstorm-card-repository";
import type { BrainstormColumnEntity } from "@/server/repositories/contracts/brainstorm-column-repository";
import { SUBJECT_IDS } from "./subjects";
import { TOPIC_IDS } from "./topics";

/**
 * Mocks centralizados e tipados (ADR-0011, CLAUDE.md §23) — quadros de Brainstorm de exemplo
 * (Fase 13 — agente `backend`), para o aluno "user-1" (Ana Recruta, mesma persona usada em
 * `./study-plan.ts`/`./lesson-progress.ts`). 2 quadros: um mais completo ("Reta final"),
 * cobrindo as 5 colunas padrão e os 4 tipos de cartão, e um menor ("Ideias soltas").
 *
 * Datas fixas em ISO 8601 (UTC), como todo mock deste projeto — nunca computadas a partir de
 * `Date.now()`.
 */

const BOARD_1_ID = "brainstorm-board-1";
const BOARD_2_ID = "brainstorm-board-2";

const BOARD_1_COLUMNS = {
  ideias: "brainstorm-column-1-ideias",
  estudar: "brainstorm-column-1-estudar",
  revisar: "brainstorm-column-1-revisar",
  duvidas: "brainstorm-column-1-duvidas",
  resolvido: "brainstorm-column-1-resolvido",
};

const BOARD_2_COLUMNS = {
  ideias: "brainstorm-column-2-ideias",
  estudar: "brainstorm-column-2-estudar",
  revisar: "brainstorm-column-2-revisar",
  duvidas: "brainstorm-column-2-duvidas",
  resolvido: "brainstorm-column-2-resolvido",
};

export const mockBrainstormBoards: BrainstormBoardEntity[] = [
  {
    id: BOARD_1_ID,
    userId: "user-1",
    title: "Brainstorm — Reta final",
    createdAt: "2026-07-08T09:00:00.000Z",
    updatedAt: "2026-07-13T18:00:00.000Z",
  },
  {
    id: BOARD_2_ID,
    userId: "user-1",
    title: "Ideias soltas",
    createdAt: "2026-07-05T20:00:00.000Z",
    updatedAt: "2026-07-05T20:30:00.000Z",
  },
];

/** Colunas padrão (`BRAINSTORM_DEFAULT_COLUMNS`, `@/config/business`) já materializadas para
 *  os 2 quadros de exemplo — mesma ordem/nomes que `createBoard` geraria. */
export const mockBrainstormColumns: BrainstormColumnEntity[] = [
  { id: BOARD_1_COLUMNS.ideias, boardId: BOARD_1_ID, name: "Ideias", order: 0, createdAt: "2026-07-08T09:00:00.000Z", updatedAt: "2026-07-08T09:00:00.000Z" },
  { id: BOARD_1_COLUMNS.estudar, boardId: BOARD_1_ID, name: "Estudar", order: 1, createdAt: "2026-07-08T09:00:00.000Z", updatedAt: "2026-07-08T09:00:00.000Z" },
  { id: BOARD_1_COLUMNS.revisar, boardId: BOARD_1_ID, name: "Revisar", order: 2, createdAt: "2026-07-08T09:00:00.000Z", updatedAt: "2026-07-08T09:00:00.000Z" },
  { id: BOARD_1_COLUMNS.duvidas, boardId: BOARD_1_ID, name: "Dúvidas", order: 3, createdAt: "2026-07-08T09:00:00.000Z", updatedAt: "2026-07-08T09:00:00.000Z" },
  { id: BOARD_1_COLUMNS.resolvido, boardId: BOARD_1_ID, name: "Resolvido", order: 4, createdAt: "2026-07-08T09:00:00.000Z", updatedAt: "2026-07-08T09:00:00.000Z" },

  { id: BOARD_2_COLUMNS.ideias, boardId: BOARD_2_ID, name: "Ideias", order: 0, createdAt: "2026-07-05T20:00:00.000Z", updatedAt: "2026-07-05T20:00:00.000Z" },
  { id: BOARD_2_COLUMNS.estudar, boardId: BOARD_2_ID, name: "Estudar", order: 1, createdAt: "2026-07-05T20:00:00.000Z", updatedAt: "2026-07-05T20:00:00.000Z" },
  { id: BOARD_2_COLUMNS.revisar, boardId: BOARD_2_ID, name: "Revisar", order: 2, createdAt: "2026-07-05T20:00:00.000Z", updatedAt: "2026-07-05T20:00:00.000Z" },
  { id: BOARD_2_COLUMNS.duvidas, boardId: BOARD_2_ID, name: "Dúvidas", order: 3, createdAt: "2026-07-05T20:00:00.000Z", updatedAt: "2026-07-05T20:00:00.000Z" },
  { id: BOARD_2_COLUMNS.resolvido, boardId: BOARD_2_ID, name: "Resolvido", order: 4, createdAt: "2026-07-05T20:00:00.000Z", updatedAt: "2026-07-05T20:00:00.000Z" },
];

export const mockBrainstormCards: BrainstormCardEntity[] = [
  // --- Quadro 1 — coluna "Ideias" ---
  {
    id: "brainstorm-card-1",
    columnId: BOARD_1_COLUMNS.ideias,
    type: "IDEIA",
    title: "Resumo comparativo: atos vinculados x discricionários",
    content: "Fazer um quadro comparativo com exemplos de cada um.",
    tags: ["administrativo", "resumo"],
    subjectId: SUBJECT_IDS.direitoAdministrativo,
    topicId: TOPIC_IDS.atosAdministrativos,
    priority: "MEDIUM",
    status: "OPEN",
    order: 0,
    convertedFlashcardId: null,
    convertedStudyPlanItemId: null,
    createdAt: "2026-07-08T09:10:00.000Z",
    updatedAt: "2026-07-08T09:10:00.000Z",
  },
  {
    id: "brainstorm-card-2",
    columnId: BOARD_1_COLUMNS.ideias,
    type: "ANOTACAO",
    title: "Testar técnica Pomodoro 25/5 nesta semana",
    content: null,
    tags: ["rotina", "pomodoro"],
    subjectId: null,
    topicId: null,
    priority: "LOW",
    status: "OPEN",
    order: 1,
    convertedFlashcardId: null,
    convertedStudyPlanItemId: null,
    createdAt: "2026-07-08T09:15:00.000Z",
    updatedAt: "2026-07-08T09:15:00.000Z",
  },
  {
    id: "brainstorm-card-9",
    columnId: BOARD_1_COLUMNS.ideias,
    type: "IDEIA",
    title: "Criar flashcards de Direitos Humanos",
    content: "Focar em tratados internacionais.",
    tags: ["direitos-humanos"],
    subjectId: SUBJECT_IDS.direitosHumanos,
    topicId: TOPIC_IDS.fundamentosDireitosHumanos,
    priority: "MEDIUM",
    // Já convertido em rascunho de flashcard (TODO Fase 14) — id ilustrativo do seed, coerente
    // com o formato gerado por `createFlashcardDraft` (`@/server/services/brainstorm/
    // flashcard-draft-store.ts`), mas o store em memória começa vazio a cada processo (mesma
    // limitação de todo mock deste projeto — não há persistência real ainda).
    status: "CONVERTED",
    order: 2,
    convertedFlashcardId: "brainstorm-flashcard-draft-seed-1",
    convertedStudyPlanItemId: null,
    createdAt: "2026-07-12T09:00:00.000Z",
    updatedAt: "2026-07-12T09:30:00.000Z",
  },

  // --- Quadro 1 — coluna "Estudar" ---
  {
    id: "brainstorm-card-3",
    columnId: BOARD_1_COLUMNS.estudar,
    type: "IDEIA",
    title: "Aprofundar controle de constitucionalidade",
    content: "Rever ADI, ADC e ADPF com jurisprudência recente.",
    tags: ["constitucional"],
    subjectId: SUBJECT_IDS.direitoConstitucional,
    topicId: TOPIC_IDS.organizacaoEstado,
    priority: "HIGH",
    status: "OPEN",
    order: 0,
    convertedFlashcardId: null,
    convertedStudyPlanItemId: null,
    createdAt: "2026-07-09T08:00:00.000Z",
    updatedAt: "2026-07-09T08:00:00.000Z",
  },
  {
    id: "brainstorm-card-4",
    columnId: BOARD_1_COLUMNS.estudar,
    type: "RESUMO",
    title: "Mapa mental de raciocínio lógico",
    content: null,
    tags: ["raciocinio-logico", "mapa-mental"],
    subjectId: SUBJECT_IDS.raciocinioLogico,
    topicId: TOPIC_IDS.logicaProposicional,
    priority: "MEDIUM",
    // Já convertido em item real do plano de estudos (`convertToStudyTask`) — id ilustrativo,
    // não precisa corresponder a um `StudyPlanItemEntity` existente em `./study-plan.ts` (o
    // mock não impõe integridade referencial entre domínios).
    status: "CONVERTED",
    order: 1,
    convertedFlashcardId: null,
    convertedStudyPlanItemId: "study-plan-item-from-brainstorm-1",
    createdAt: "2026-07-09T08:30:00.000Z",
    updatedAt: "2026-07-11T10:00:00.000Z",
  },

  // --- Quadro 1 — coluna "Revisar" ---
  {
    id: "brainstorm-card-5",
    columnId: BOARD_1_COLUMNS.revisar,
    type: "RESUMO",
    title: "Revisar crimes em espécie antes do simulado",
    content: "Focar em crimes contra a pessoa e contra o patrimônio.",
    tags: ["penal", "revisao"],
    subjectId: SUBJECT_IDS.direitoPenal,
    topicId: TOPIC_IDS.crimesEmEspecie,
    priority: "HIGH",
    status: "OPEN",
    order: 0,
    convertedFlashcardId: null,
    convertedStudyPlanItemId: null,
    createdAt: "2026-07-10T14:00:00.000Z",
    updatedAt: "2026-07-10T14:00:00.000Z",
  },

  // --- Quadro 1 — coluna "Dúvidas" ---
  {
    id: "brainstorm-card-6",
    columnId: BOARD_1_COLUMNS.duvidas,
    type: "DUVIDA",
    title: "Diferença entre poder de polícia e poder disciplinar",
    content: "Perguntar ao professor Bruno na próxima aula.",
    tags: ["administrativo", "duvida"],
    subjectId: SUBJECT_IDS.direitoAdministrativo,
    topicId: TOPIC_IDS.poderesAdministrativos,
    priority: "MEDIUM",
    status: "OPEN",
    order: 0,
    convertedFlashcardId: null,
    convertedStudyPlanItemId: null,
    createdAt: "2026-07-11T09:00:00.000Z",
    updatedAt: "2026-07-11T09:00:00.000Z",
  },
  {
    id: "brainstorm-card-7",
    columnId: BOARD_1_COLUMNS.duvidas,
    type: "DUVIDA",
    title: "Quando usar crase antes de pronome possessivo?",
    content: null,
    tags: ["portugues"],
    subjectId: SUBJECT_IDS.linguaPortuguesa,
    topicId: TOPIC_IDS.gramaticaNormativa,
    priority: "LOW",
    status: "OPEN",
    order: 1,
    convertedFlashcardId: null,
    convertedStudyPlanItemId: null,
    createdAt: "2026-07-11T09:30:00.000Z",
    updatedAt: "2026-07-11T09:30:00.000Z",
  },

  // --- Quadro 1 — coluna "Resolvido" ---
  {
    id: "brainstorm-card-8",
    columnId: BOARD_1_COLUMNS.resolvido,
    type: "DUVIDA",
    title: "Dúvida sobre prazo prescricional — resolvida com o professor",
    content: "Resposta: a prescrição em abstrato segue a pena máxima cominada.",
    tags: ["penal"],
    subjectId: SUBJECT_IDS.direitoPenal,
    topicId: TOPIC_IDS.teoriaDoCrime,
    priority: "MEDIUM",
    // `status` continua OPEN de propósito — chegar à coluna "Resolvido" (`resolvido: true` no
    // DTO) é independente do ciclo de vida de conversão (docs/DATA-MODEL.md).
    status: "OPEN",
    order: 0,
    convertedFlashcardId: null,
    convertedStudyPlanItemId: null,
    createdAt: "2026-07-07T10:00:00.000Z",
    updatedAt: "2026-07-12T16:00:00.000Z",
  },

  // --- Quadro 2 ("Ideias soltas") ---
  {
    id: "brainstorm-card-10",
    columnId: BOARD_2_COLUMNS.ideias,
    type: "IDEIA",
    title: "Montar grupo de estudos aos sábados",
    content: null,
    tags: ["grupo"],
    subjectId: null,
    topicId: null,
    priority: "LOW",
    status: "OPEN",
    order: 0,
    convertedFlashcardId: null,
    convertedStudyPlanItemId: null,
    createdAt: "2026-07-05T20:10:00.000Z",
    updatedAt: "2026-07-05T20:10:00.000Z",
  },
  {
    id: "brainstorm-card-11",
    columnId: BOARD_2_COLUMNS.estudar,
    type: "ANOTACAO",
    title: "Assistir aulas de atualidades 2x por semana",
    content: null,
    tags: [],
    subjectId: SUBJECT_IDS.atualidades,
    topicId: null,
    priority: "MEDIUM",
    status: "OPEN",
    order: 0,
    convertedFlashcardId: null,
    convertedStudyPlanItemId: null,
    createdAt: "2026-07-05T20:20:00.000Z",
    updatedAt: "2026-07-05T20:20:00.000Z",
  },
];
