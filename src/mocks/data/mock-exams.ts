import type { MockExamEntity } from "@/server/repositories/contracts/mock-exam-repository";

/**
 * Mocks centralizados e tipados (ADR-0011, CLAUDE.md §23) — simulados de catálogo (Fase 10 —
 * agente `simulations`). 4 simulados (≥3 exigido): 3 completos (um por curso/concurso do
 * catálogo, `courses.ts`) + 1 "simulado por matéria" (Direito Penal), todos compostos por
 * questões de `./questions.ts`. `questionIds` já reflete a ordem de exibição (equivalente a
 * `MockExamQuestion.order`, docs/DATA-MODEL.md) — ver nota em `mock-exam-repository.ts` sobre
 * este campo ser de conveniência de leitura.
 */
export const MOCK_EXAM_IDS = {
  policiaMilitar: "mock-exam-pm",
  guardaCivilMunicipal: "mock-exam-gcm",
  policiaPenal: "mock-exam-pp",
  direitoPenal: "mock-exam-materia-direito-penal",
} as const;

export const mockMockExams: MockExamEntity[] = [
  {
    id: MOCK_EXAM_IDS.policiaMilitar,
    title: "Simulado Completo — Polícia Militar",
    description: "Simulado completo cobrindo as principais matérias do edital de Polícia Militar.",
    durationMinutes: 90,
    status: "PUBLISHED",
    createdById: null,
    isPersonal: false,
    questionIds: [
      "question-portugues-01",
      "question-portugues-02",
      "question-raciocinio-01",
      "question-raciocinio-02",
      "question-constitucional-01",
      "question-constitucional-02",
      "question-constitucional-03",
      "question-administrativo-01",
      "question-administrativo-02",
      "question-direitos-humanos-01",
      "question-direitos-humanos-02",
      "question-direitos-humanos-03",
    ],
    createdAt: "2026-02-01T00:00:00.000Z",
    deletedAt: null,
  },
  {
    id: MOCK_EXAM_IDS.guardaCivilMunicipal,
    title: "Simulado Completo — Guarda Civil Municipal",
    description: "Simulado completo cobrindo as principais matérias do edital de Guarda Civil Municipal.",
    durationMinutes: 75,
    status: "PUBLISHED",
    createdById: null,
    isPersonal: false,
    questionIds: [
      "question-portugues-03",
      "question-portugues-04",
      "question-matematica-01",
      "question-matematica-02",
      "question-matematica-03",
      "question-administrativo-03",
      "question-administrativo-04",
      "question-direitos-humanos-04",
      "question-direitos-humanos-05",
      "question-constitucional-04",
    ],
    createdAt: "2026-02-01T00:00:00.000Z",
    deletedAt: null,
  },
  {
    id: MOCK_EXAM_IDS.policiaPenal,
    title: "Simulado Completo — Polícia Penal",
    description: "Simulado completo cobrindo as principais matérias do edital de Polícia Penal.",
    durationMinutes: 100,
    status: "PUBLISHED",
    createdById: null,
    isPersonal: false,
    questionIds: [
      "question-portugues-05",
      "question-informatica-01",
      "question-informatica-02",
      "question-informatica-03",
      "question-informatica-04",
      "question-penal-01",
      "question-penal-02",
      "question-penal-03",
      "question-penal-04",
      "question-penal-05",
      "question-constitucional-05",
      "question-raciocinio-03",
      "question-raciocinio-04",
    ],
    createdAt: "2026-02-01T00:00:00.000Z",
    deletedAt: null,
  },
  {
    id: MOCK_EXAM_IDS.direitoPenal,
    title: "Simulado por Matéria — Direito Penal",
    description: "Simulado focado exclusivamente em Direito Penal — teoria do crime e crimes em espécie.",
    durationMinutes: 30,
    status: "PUBLISHED",
    createdById: null,
    isPersonal: false,
    questionIds: [
      "question-penal-01",
      "question-penal-02",
      "question-penal-03",
      "question-penal-04",
      "question-penal-05",
    ],
    createdAt: "2026-02-05T00:00:00.000Z",
    deletedAt: null,
  },
];
