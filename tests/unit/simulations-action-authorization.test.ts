import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session as NextAuthSession } from "next-auth";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock("@/server/auth", () => ({
  auth: authMock,
}));

// Importados após o mock de "@/server/auth" (usado por `@/server/authorization`).
const {
  createAttemptAction,
  submitAttemptAction,
  getAttemptAction,
  getResultAction,
  toggleFavoriteAction,
  getHistoryAction,
  getErrorNotebookAction,
  listFavoritesAction,
  listMockExamCatalogAction,
  listSubjectOptionsAction,
  listTopicOptionsAction,
} = await import("@/server/actions/simulations");
const { MOCK_EXAM_IDS, SUBJECT_IDS, TOPIC_IDS } = await import("@/mocks");
const { __resetMockMockExamStore } = await import("@/server/repositories/mock/mock-exam-repository");
const { __resetMockMockExamAttemptStore } = await import(
  "@/server/repositories/mock/mock-exam-attempt-repository"
);
const { __resetMockQuestionAttemptStore } = await import(
  "@/server/repositories/mock/question-attempt-repository"
);
const { __resetMockQuestionFavoriteStore } = await import(
  "@/server/repositories/mock/question-favorite-repository"
);
const { __resetSimulationsRateLimitStore } = await import("@/server/services/simulations");

function fakeSession(role: NextAuthSession["user"]["role"], id: string): NextAuthSession {
  return {
    user: { id, role, name: "Teste", email: "teste@example.com" },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as NextAuthSession;
}

describe("actions/simulations — autorização e validação na fronteira (ActionResult)", () => {
  beforeEach(() => {
    authMock.mockReset();
    __resetMockMockExamStore();
    __resetMockMockExamAttemptStore();
    __resetMockQuestionAttemptStore();
    __resetMockQuestionFavoriteStore();
    __resetSimulationsRateLimitStore();
  });

  describe("createAttemptAction", () => {
    it("retorna fail com code UNAUTHENTICATED quando não há sessão", async () => {
      authMock.mockResolvedValue(null);

      const result = await createAttemptAction({ mockExamId: MOCK_EXAM_IDS.direitoPenal });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("UNAUTHENTICATED");
      }
    });

    it("retorna ok com a tentativa criada, sem gabarito", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "action-user-1"));

      const result = await createAttemptAction({ mockExamId: MOCK_EXAM_IDS.direitoPenal });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.questions.length).toBeGreaterThan(0);
        expect(JSON.stringify(result.data)).not.toContain("isCorrect");
      }
    });

    it("retorna fail com VALIDATION_ERROR para `quantity` inválido", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "action-user-1"));

      const result = await createAttemptAction({ quantity: 0 });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
      }
    });

    it("aplica rate limit leve (§24): criações em rajada para o mesmo usuário são barradas", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "action-user-rate-create"));

      // Duas criações em rajada (sem resetar o rate limit): cada createAttempt grava um registro,
      // então a 2ª chamada imediata é barrada com RATE_LIMITED (achado Fase 10 — BAIXO).
      const first = await createAttemptAction({ mockExamId: MOCK_EXAM_IDS.direitoPenal });
      const second = await createAttemptAction({ mockExamId: MOCK_EXAM_IDS.direitoPenal });

      expect(first.ok).toBe(true);
      expect(second.ok).toBe(false);
      if (!second.ok) {
        expect(second.error.code).toBe("RATE_LIMITED");
      }
    });
  });

  describe("submitAttemptAction", () => {
    it("retorna fail com code UNAUTHENTICATED quando não há sessão", async () => {
      authMock.mockResolvedValue(null);

      const result = await submitAttemptAction({ attemptId: "any", answers: [] });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("UNAUTHENTICATED");
      }
    });

    it("ignora campos forjados (nota/pontos) fora do contrato — a nota vem sempre do servidor", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "action-user-forjado"));

      const created = await createAttemptAction({ mockExamId: MOCK_EXAM_IDS.direitoPenal });
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      const rawForged = {
        attemptId: created.data.id,
        answers: created.data.questions.map((q) => ({ questionId: q.questionId, selectedOptionId: null })),
        scorePercent: 100,
        correctCount: 999,
      };

      const result = await submitAttemptAction(rawForged);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.scorePercent).toBe(0);
        expect(result.data.correctCount).toBe(0);
      }
    });

    it("retorna fail ao tentar finalizar a mesma tentativa duas vezes", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "action-user-dupla"));

      const created = await createAttemptAction({ mockExamId: MOCK_EXAM_IDS.direitoPenal });
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      const answers = created.data.questions.map((q) => ({ questionId: q.questionId, selectedOptionId: null }));
      const first = await submitAttemptAction({ attemptId: created.data.id, answers });
      // O rate limit leve (intervalo mínimo entre submissões) é ortogonal à guarda de
      // dupla-finalização — reseta-o para garantir que a 2ª chamada chegue ao service e seja
      // rejeitada por CONFLICT (não por RATE_LIMITED), que é o comportamento sob teste aqui.
      __resetSimulationsRateLimitStore();
      const second = await submitAttemptAction({ attemptId: created.data.id, answers });

      expect(first.ok).toBe(true);
      expect(second.ok).toBe(false);
      if (!second.ok) {
        expect(second.error.code).toBe("CONFLICT");
      }
    });

    it("aplica rate limit leve (§24): submissões em rajada para o mesmo usuário são barradas", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "action-user-rate-submit"));

      const created = await createAttemptAction({ mockExamId: MOCK_EXAM_IDS.direitoPenal });
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      const answers = created.data.questions.map((q) => ({ questionId: q.questionId, selectedOptionId: null }));
      // Duas submissões em rajada (sem resetar o rate limit): a 2ª é barrada ANTES do service.
      const first = await submitAttemptAction({ attemptId: created.data.id, answers });
      const second = await submitAttemptAction({ attemptId: created.data.id, answers });

      expect(first.ok).toBe(true);
      expect(second.ok).toBe(false);
      if (!second.ok) {
        expect(second.error.code).toBe("RATE_LIMITED");
      }
    });
  });

  describe("getAttemptAction / getResultAction — anti-IDOR", () => {
    it("usuário não consegue ler a tentativa de outro usuário", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "action-owner"));
      const created = await createAttemptAction({ mockExamId: MOCK_EXAM_IDS.direitoPenal });
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      authMock.mockResolvedValue(fakeSession("aluno", "action-attacker"));
      const result = await getAttemptAction({ attemptId: created.data.id });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("FORBIDDEN");
      }
    });

    it("retorna fail com NOT_FOUND para `attemptId` inexistente", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "action-user-notfound"));

      const result = await getResultAction({ attemptId: "attempt-inexistente" });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });
  });

  describe("toggleFavoriteAction", () => {
    it("alterna o favorito e é idempotente na alternância (2 chamadas voltam ao estado original)", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "action-user-fav"));

      const first = await toggleFavoriteAction({ questionId: "question-penal-01" });
      const second = await toggleFavoriteAction({ questionId: "question-penal-01" });

      expect(first.ok).toBe(true);
      expect(second.ok).toBe(true);
      if (first.ok && second.ok) {
        expect(first.data.isFavorite).toBe(true);
        expect(second.data.isFavorite).toBe(false);
      }
    });
  });

  describe("getHistoryAction / getErrorNotebookAction", () => {
    it("retorna fail com UNAUTHENTICATED sem sessão", async () => {
      authMock.mockResolvedValue(null);

      const history = await getHistoryAction();
      const notebook = await getErrorNotebookAction();

      expect(history.ok).toBe(false);
      expect(notebook.ok).toBe(false);
    });

    it("retorna ok com listas (possivelmente vazias) para um usuário autenticado", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "action-user-history"));

      const history = await getHistoryAction();
      const notebook = await getErrorNotebookAction();

      expect(history.ok).toBe(true);
      expect(notebook.ok).toBe(true);
    });
  });

  describe("listFavoritesAction", () => {
    it("retorna fail com UNAUTHENTICATED sem sessão", async () => {
      authMock.mockResolvedValue(null);

      const result = await listFavoritesAction();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("UNAUTHENTICATED");
      }
    });

    it("retorna ok com a questão favoritada após toggleFavoriteAction", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "action-user-favlist"));

      await toggleFavoriteAction({ questionId: "question-penal-01" });
      const result = await listFavoritesAction();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.some((item) => item.questionId === "question-penal-01")).toBe(true);
      }
    });
  });

  describe("listMockExamCatalogAction", () => {
    it("retorna fail com UNAUTHENTICATED sem sessão", async () => {
      authMock.mockResolvedValue(null);

      const result = await listMockExamCatalogAction();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("UNAUTHENTICATED");
      }
    });

    it("retorna o catálogo publicado, sem questionIds/gabarito", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "action-user-catalog"));

      const result = await listMockExamCatalogAction();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.length).toBeGreaterThan(0);
        expect(result.data.some((item) => item.id === MOCK_EXAM_IDS.direitoPenal)).toBe(true);
        expect(JSON.stringify(result.data)).not.toContain("isCorrect");
        expect(JSON.stringify(result.data)).not.toContain("questionIds");
      }
    });
  });

  describe("listSubjectOptionsAction / listTopicOptionsAction", () => {
    it("retorna fail com UNAUTHENTICATED sem sessão", async () => {
      authMock.mockResolvedValue(null);

      const subjects = await listSubjectOptionsAction();
      const topics = await listTopicOptionsAction({ subjectId: SUBJECT_IDS.direitoPenal });

      expect(subjects.ok).toBe(false);
      expect(topics.ok).toBe(false);
    });

    it("retorna as matérias e os assuntos da matéria informada", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "action-user-subjects"));

      const subjects = await listSubjectOptionsAction();
      expect(subjects.ok).toBe(true);
      if (subjects.ok) {
        expect(subjects.data.some((subject) => subject.id === SUBJECT_IDS.direitoPenal)).toBe(true);
      }

      const topics = await listTopicOptionsAction({ subjectId: SUBJECT_IDS.direitoPenal });
      expect(topics.ok).toBe(true);
      if (topics.ok) {
        expect(topics.data.length).toBeGreaterThan(0);
        expect(topics.data.every((topic) => topic.subjectId === SUBJECT_IDS.direitoPenal)).toBe(true);
        expect(topics.data.some((topic) => topic.id === TOPIC_IDS.teoriaDoCrime)).toBe(true);
      }
    });

    it("retorna fail com VALIDATION_ERROR quando subjectId está ausente", async () => {
      authMock.mockResolvedValue(fakeSession("aluno", "action-user-subjects-invalid"));

      const result = await listTopicOptionsAction({});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
      }
    });
  });
});
