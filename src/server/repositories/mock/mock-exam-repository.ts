import { mockMockExams } from "@/mocks";
import type {
  MockExamCreateInput,
  MockExamEntity,
  MockExamRepository,
} from "../contracts/mock-exam-repository";

/**
 * Implementação mock — seed inicial de `src/mocks/data/mock-exams.ts` (ADR-0011).
 *
 * Mantém uma cópia mutável em memória de processo (mesmo padrão de
 * `MockLessonProgressRepository`) para suportar `create()` — simulados personalizados
 * montados dinamicamente a partir de filtros (`src/server/services/simulations/question-pool.ts`).
 */
let store: MockExamEntity[] = [...mockMockExams];
let sequence = store.length;

export class MockMockExamRepository implements MockExamRepository {
  async findById(id: string): Promise<MockExamEntity | null> {
    return store.find((exam) => exam.id === id) ?? null;
  }

  async list(): Promise<MockExamEntity[]> {
    // Catálogo COMPARTILHADO: só publicados e NÃO pessoais — nunca vaza o simulado ad-hoc de um
    // aluno para o catálogo de outro (achado de segurança Fase 10 — MÉDIO).
    return store.filter((exam) => exam.status === "PUBLISHED" && !exam.isPersonal);
  }

  async create(input: MockExamCreateInput): Promise<MockExamEntity> {
    sequence += 1;
    // `create()` só é usado para simulados PESSOAIS ad-hoc (ver `MockExamCreateInput`): marca
    // como pessoal e DRAFT para que nunca apareça no catálogo (`list()`) nem seja iniciável por
    // `mockExamId` por outro usuário (guarda em `question-pool.ts`).
    const exam: MockExamEntity = {
      id: `mock-exam-custom-${sequence}`,
      title: input.title,
      description: input.description,
      durationMinutes: input.durationMinutes,
      status: "DRAFT",
      questionIds: [...input.questionIds],
      createdById: input.createdById,
      isPersonal: true,
      createdAt: input.now.toISOString(),
    };
    store.push(exam);
    return exam;
  }
}

/** Uso exclusivo de testes — restaura o store mock ao seed original. */
export function __resetMockMockExamStore(): void {
  store = [...mockMockExams];
  sequence = store.length;
}
