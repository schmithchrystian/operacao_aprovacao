import { mockMockExams } from "@/mocks";
import type {
  MockExamCatalogCreateInput,
  MockExamCreateInput,
  MockExamEntity,
  MockExamRepository,
  MockExamUpdateInput,
} from "../contracts/mock-exam-repository";
import { mockStore } from "./mock-store";

/**
 * Implementação mock — seed inicial de `src/mocks/data/mock-exams.ts` (ADR-0011).
 *
 * Mantém uma cópia mutável em memória de processo (mesmo padrão de
 * `MockLessonProgressRepository`) para suportar `create()` — simulados personalizados
 * montados dinamicamente a partir de filtros (`src/server/services/simulations/question-pool.ts`).
 * Estado via `mockStore` (`./mock-store.ts`) — compartilhado entre instâncias de módulo.
 */
const store = mockStore<MockExamEntity[]>("mock-exam", () => [...mockMockExams]);
const sequence = mockStore<{ value: number }>("mock-exam:sequence", () => ({ value: store.length }));

export class MockMockExamRepository implements MockExamRepository {
  async findById(id: string): Promise<MockExamEntity | null> {
    return store.find((exam) => exam.id === id) ?? null;
  }

  async list(): Promise<MockExamEntity[]> {
    // Catálogo COMPARTILHADO: só publicados, ativos e NÃO pessoais — nunca vaza o simulado
    // ad-hoc de um aluno para o catálogo de outro (achado de segurança Fase 10 — MÉDIO).
    return store.filter((exam) => exam.status === "PUBLISHED" && !exam.isPersonal && exam.deletedAt === null);
  }

  async listForAdmin(): Promise<MockExamEntity[]> {
    return store.filter((exam) => !exam.isPersonal);
  }

  async create(input: MockExamCreateInput): Promise<MockExamEntity> {
    sequence.value += 1;
    // `create()` só é usado para simulados PESSOAIS ad-hoc (ver `MockExamCreateInput`): marca
    // como pessoal e DRAFT para que nunca apareça no catálogo (`list()`) nem seja iniciável por
    // `mockExamId` por outro usuário (guarda em `question-pool.ts`).
    const exam: MockExamEntity = {
      id: `mock-exam-custom-${sequence.value}`,
      title: input.title,
      description: input.description,
      durationMinutes: input.durationMinutes,
      status: "DRAFT",
      questionIds: [...input.questionIds],
      createdById: input.createdById,
      isPersonal: true,
      createdAt: input.now.toISOString(),
      deletedAt: null,
    };
    store.push(exam);
    return exam;
  }

  async createCatalog(input: MockExamCatalogCreateInput): Promise<MockExamEntity> {
    sequence.value += 1;
    const exam: MockExamEntity = {
      id: `mock-exam-catalog-${sequence.value}`,
      title: input.title,
      description: input.description,
      durationMinutes: input.durationMinutes,
      status: "DRAFT",
      questionIds: [...input.questionIds],
      createdById: input.createdById,
      isPersonal: false,
      createdAt: input.now.toISOString(),
      deletedAt: null,
    };
    store.push(exam);
    return exam;
  }

  async update(input: MockExamUpdateInput): Promise<MockExamEntity> {
    const index = store.findIndex((exam) => exam.id === input.id);
    if (index < 0) {
      throw new Error(`[mocks/mock-exam] Simulado não encontrado: ${input.id}`);
    }
    const current = store[index]!;
    const updated: MockExamEntity = {
      ...current,
      title: input.title ?? current.title,
      description: input.description === undefined ? current.description : input.description,
      durationMinutes: input.durationMinutes ?? current.durationMinutes,
      questionIds: input.questionIds ? [...input.questionIds] : current.questionIds,
      status: input.status ?? current.status,
    };
    store[index] = updated;
    return updated;
  }

  async softDelete(id: string, now: Date): Promise<MockExamEntity> {
    const index = store.findIndex((exam) => exam.id === id);
    if (index < 0) {
      throw new Error(`[mocks/mock-exam] Simulado não encontrado: ${id}`);
    }
    const updated: MockExamEntity = { ...store[index]!, deletedAt: now.toISOString() };
    store[index] = updated;
    return updated;
  }
}

/** Uso exclusivo de testes — restaura o store mock ao seed original. */
export function __resetMockMockExamStore(): void {
  store.splice(0, store.length, ...mockMockExams);
  sequence.value = store.length;
}
