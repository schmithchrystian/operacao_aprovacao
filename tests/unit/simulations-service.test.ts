import { ensureAuthenticatedUser } from "../helpers/authenticated-user";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session as NextAuthSession } from "next-auth";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock("@/server/auth", () => ({
  auth: authMock,
}));

// Importados após o mock de "@/server/auth" (usado por `@/server/authorization`).
const {
  createAttempt,
  submitAndFinalize,
  getAttemptForTaking,
  getResult,
  getAttemptStatus,
  getErrorNotebook,
  getHistory,
  listMockExamCatalog,
} = await import("@/server/services/simulations");
const { getRepositories } = await import("@/server/repositories");
const { getAuditRecords } = await import("@/server/audit");
const { mockExamConfigInputSchema } = await import("@/contracts/simulations");
const { MOCK_EXAM_IDS, SUBJECT_IDS } = await import("@/mocks");
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
const { __resetMockGamificationEventStore } = await import(
  "@/server/repositories/mock/gamification-event-repository"
);
const { __resetMockPointTransactionStore } = await import(
  "@/server/repositories/mock/point-transaction-repository"
);

/**
 * Testes da Fase 10 (agente `simulations`, CLAUDE.md §18/§25). Cobre as regras duras:
 * gabarito nunca antes da correção, tentativa não finaliza duas vezes, anti-IDOR, tempo
 * validado no servidor, payload forjado ignorado, caderno de erros, pontuação idempotente.
 */
function fakeSession(id: string): NextAuthSession {
  ensureAuthenticatedUser(id);
  return {
    user: { id, role: "aluno", name: "Teste", email: "teste@example.com" },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as NextAuthSession;
}

/** Aplica os defaults do contrato (`quantity`/`mode`) — o service espera a entrada já
 *  parseada pelo Zod, como faria `parseInput` na fronteira da action em produção. */
function cfg(partial: Parameters<typeof mockExamConfigInputSchema.parse>[0]) {
  return mockExamConfigInputSchema.parse(partial);
}

const BASE_TIME = Date.parse("2026-07-13T10:00:00.000Z");

describe("services/simulations — Fase 10", () => {
  beforeEach(() => {
    authMock.mockReset();
    __resetMockMockExamStore();
    __resetMockMockExamAttemptStore();
    __resetMockQuestionAttemptStore();
    __resetMockQuestionFavoriteStore();
    __resetMockGamificationEventStore();
    __resetMockPointTransactionStore();
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("createAttempt — proteção do gabarito", () => {
    it("nunca inclui `isCorrect` em nenhum lugar do DTO da tentativa", async () => {
      const userId = "sim-user-gabarito";
      authMock.mockResolvedValue(fakeSession(userId));

      const attempt = await createAttempt(
        userId,
        cfg({ mockExamId: MOCK_EXAM_IDS.direitoPenal, quantity: 5 }),
      );

      expect(attempt.questions.length).toBe(5);
      const serialized = JSON.stringify(attempt);
      expect(serialized).not.toContain("isCorrect");
      expect(serialized).not.toContain("explanation");
      for (const question of attempt.questions) {
        for (const option of question.options) {
          expect(Object.keys(option).sort()).toEqual(["id", "label", "text"]);
        }
      }
    });

    it("getAttemptForTaking também nunca expõe gabarito enquanto IN_PROGRESS", async () => {
      const userId = "sim-user-gabarito-2";
      authMock.mockResolvedValue(fakeSession(userId));

      const created = await createAttempt(userId, cfg({ mockExamId: MOCK_EXAM_IDS.direitoPenal }));
      const fetched = await getAttemptForTaking(userId, created.id);

      expect(JSON.stringify(fetched)).not.toContain("isCorrect");
      expect(fetched.status).toBe("IN_PROGRESS");
    });
  });

  describe("createAttempt — filtros/modos de seleção", () => {
    it("cria uma tentativa personalizada filtrando por matéria e respeitando `quantity`", async () => {
      const userId = "sim-user-filtro";
      authMock.mockResolvedValue(fakeSession(userId));

      const attempt = await createAttempt(
        userId,
        cfg({ subjectId: SUBJECT_IDS.direitoPenal, quantity: 3, mode: "RANDOM" }),
      );

      expect(attempt.questions).toHaveLength(3);
      for (const question of attempt.questions) {
        expect(question.subjectName).toBe("Direito Penal");
      }
    });

    it("usa o conjunto fixo de questões do simulado quando `mockExamId` é informado", async () => {
      const userId = "sim-user-exame-completo";
      authMock.mockResolvedValue(fakeSession(userId));

      const attempt = await createAttempt(userId, cfg({ mockExamId: MOCK_EXAM_IDS.direitoPenal }));

      expect(attempt.questions).toHaveLength(5);
      expect(attempt.mockExamId).toBe(MOCK_EXAM_IDS.direitoPenal);
    });

    it("modo `NEW_ONLY` exclui questões já respondidas pelo usuário", async () => {
      const userId = "sim-user-novas";
      authMock.mockResolvedValue(fakeSession(userId));

      const first = await createAttempt(userId, cfg({ mockExamId: MOCK_EXAM_IDS.direitoPenal }));
      await submitAndFinalize(userId, {
        attemptId: first.id,
        answers: first.questions.map((q) => ({ questionId: q.questionId, selectedOptionId: q.options[0]!.id })),
      });

      await expect(
        createAttempt(userId, cfg({ subjectId: SUBJECT_IDS.direitoPenal, mode: "NEW_ONLY" })),
      ).rejects.toThrow();
    });
  });

  describe("submitAndFinalize — correção e finalização", () => {
    it("corrige no servidor e calcula nota/acertos a partir do gabarito real", async () => {
      const userId = "sim-user-correcao";
      authMock.mockResolvedValue(fakeSession(userId));

      const attempt = await createAttempt(userId, cfg({ mockExamId: MOCK_EXAM_IDS.direitoPenal }));
      const repos = getRepositories();

      // Monta respostas 100% corretas usando o gabarito real do repositório (nunca do DTO da tentativa).
      const answers = await Promise.all(
        attempt.questions.map(async (q) => {
          const options = await repos.questionOptions.listByQuestionId(q.questionId);
          const correct = options.find((o) => o.isCorrect)!;
          return { questionId: q.questionId, selectedOptionId: correct.id };
        }),
      );

      const result = await submitAndFinalize(userId, { attemptId: attempt.id, answers });

      expect(result.correctCount).toBe(5);
      expect(result.wrongCount).toBe(0);
      expect(result.blankCount).toBe(0);
      expect(result.scorePercent).toBe(100);
      expect(result.status).toBe("FINISHED");
      // Gabarito liberado só agora.
      expect(result.questions.every((q) => typeof q.isCorrect === "boolean")).toBe(true);
    });

    it("payload com nota/acertos forjados é ignorado — a nota vem sempre do servidor", async () => {
      const userId = "sim-user-forjado";
      authMock.mockResolvedValue(fakeSession(userId));

      const attempt = await createAttempt(userId, cfg({ mockExamId: MOCK_EXAM_IDS.direitoPenal }));

      // Todas as respostas em branco (selectedOptionId: null) — mas o payload bruto tenta
      // forjar campos extras que `submitAnswersInputSchema` nem declara.
      const forgedPayload = {
        attemptId: attempt.id,
        answers: attempt.questions.map((q) => ({ questionId: q.questionId, selectedOptionId: null })),
        // Campos abaixo NÃO existem no contrato — devem ser descartados pelo Zod.
        scorePercent: 100,
        correctCount: 999,
        points: 999999,
      };

      const result = await submitAndFinalize(userId, forgedPayload as never);

      expect(result.scorePercent).toBe(0);
      expect(result.correctCount).toBe(0);
      expect(result.blankCount).toBe(5);
      expect(result.points).toBeLessThan(999999);
    });

    it("questões erradas vão para o caderno de erros", async () => {
      const userId = "sim-user-erros";
      authMock.mockResolvedValue(fakeSession(userId));

      const attempt = await createAttempt(userId, cfg({ mockExamId: MOCK_EXAM_IDS.direitoPenal }));
      const repos = getRepositories();

      const answers = await Promise.all(
        attempt.questions.map(async (q) => {
          const options = await repos.questionOptions.listByQuestionId(q.questionId);
          const wrong = options.find((o) => !o.isCorrect)!;
          return { questionId: q.questionId, selectedOptionId: wrong.id };
        }),
      );

      await submitAndFinalize(userId, { attemptId: attempt.id, answers });

      const notebook = await getErrorNotebook(userId);
      const notebookQuestionIds = new Set(notebook.map((item) => item.questionId));
      for (const question of attempt.questions) {
        expect(notebookQuestionIds.has(question.questionId)).toBe(true);
      }
    });

    it("tentativa finalizada não pode ser finalizada de novo (2ª chamada rejeitada, sem repontuar)", async () => {
      const userId = "sim-user-dupla-finalizacao";
      authMock.mockResolvedValue(fakeSession(userId));

      const attempt = await createAttempt(userId, cfg({ mockExamId: MOCK_EXAM_IDS.direitoPenal }));
      const repos = getRepositories();
      const answers = await Promise.all(
        attempt.questions.map(async (q) => {
          const options = await repos.questionOptions.listByQuestionId(q.questionId);
          const correct = options.find((o) => o.isCorrect)!;
          return { questionId: q.questionId, selectedOptionId: correct.id };
        }),
      );

      const first = await submitAndFinalize(userId, { attemptId: attempt.id, answers });
      const { points: pointsAfterFirst } = await repos.pointTransactions.sumByUserId(userId);

      await expect(submitAndFinalize(userId, { attemptId: attempt.id, answers })).rejects.toThrow();

      const { points: pointsAfterSecond } = await repos.pointTransactions.sumByUserId(userId);
      expect(pointsAfterSecond).toBe(pointsAfterFirst);
      expect(first.points).toBeGreaterThan(0);

      // Também rejeita respostas enviadas após a finalização (mesma checagem).
      await expect(
        submitAndFinalize(userId, {
          attemptId: attempt.id,
          answers: [{ questionId: attempt.questions[0]!.questionId, selectedOptionId: null }],
        }),
      ).rejects.toThrow();
    });

    it("pontuação é idempotente — chamadas concorrentes não creditam pontos duas vezes", async () => {
      const userId = "sim-user-idempotente";
      authMock.mockResolvedValue(fakeSession(userId));

      const attempt = await createAttempt(userId, cfg({ mockExamId: MOCK_EXAM_IDS.direitoPenal }));
      const repos = getRepositories();
      const answers = await Promise.all(
        attempt.questions.map(async (q) => {
          const options = await repos.questionOptions.listByQuestionId(q.questionId);
          const correct = options.find((o) => o.isCorrect)!;
          return { questionId: q.questionId, selectedOptionId: correct.id };
        }),
      );

      const results = await Promise.allSettled([
        submitAndFinalize(userId, { attemptId: attempt.id, answers }),
        submitAndFinalize(userId, { attemptId: attempt.id, answers }),
      ]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      const events = await repos.gamificationEvents.listByUserId(userId);
      const mockExamEvents = events.filter((e) => e.type === "MOCK_EXAM_COMPLETED");
      expect(mockExamEvents).toHaveLength(1);
    });

    it("tempo estourado (além da tolerância) é rejeitado e expira a tentativa", async () => {
      const userId = "sim-user-tempo";
      authMock.mockResolvedValue(fakeSession(userId));

      const attempt = await createAttempt(
        userId,
        cfg({ mockExamId: MOCK_EXAM_IDS.direitoPenal, timeLimitMinutes: 1 }),
      );

      // 100s > 60s (limite) + 30s (tolerância) = 90s permitidos.
      vi.setSystemTime(BASE_TIME + 100_000);

      await expect(
        submitAndFinalize(userId, {
          attemptId: attempt.id,
          answers: [{ questionId: attempt.questions[0]!.questionId, selectedOptionId: null }],
        }),
      ).rejects.toThrow();

      const repos = getRepositories();
      const stored = await repos.mockExamAttempts.findById(attempt.id);
      expect(stored?.status).toBe("EXPIRED");
    });

    it("responder uma questão que não pertence à tentativa é rejeitado", async () => {
      const userId = "sim-user-questao-estranha";
      authMock.mockResolvedValue(fakeSession(userId));

      const attempt = await createAttempt(userId, cfg({ mockExamId: MOCK_EXAM_IDS.direitoPenal }));

      await expect(
        submitAndFinalize(userId, {
          attemptId: attempt.id,
          answers: [{ questionId: "question-portugues-01", selectedOptionId: null }],
        }),
      ).rejects.toThrow();
    });
  });

  describe("anti-IDOR — tentativa de outro usuário", () => {
    it("usuário não consegue ler a tentativa (em andamento) de outro usuário", async () => {
      const owner = "sim-user-dono";
      const attacker = "sim-user-atacante";
      authMock.mockResolvedValue(fakeSession(owner));
      const attempt = await createAttempt(owner, cfg({ mockExamId: MOCK_EXAM_IDS.direitoPenal }));

      authMock.mockResolvedValue(fakeSession(attacker));
      await expect(getAttemptForTaking(attacker, attempt.id)).rejects.toThrow();
    });

    it("usuário não consegue submeter respostas para a tentativa de outro usuário", async () => {
      const owner = "sim-user-dono-2";
      const attacker = "sim-user-atacante-2";
      authMock.mockResolvedValue(fakeSession(owner));
      const attempt = await createAttempt(owner, cfg({ mockExamId: MOCK_EXAM_IDS.direitoPenal }));

      authMock.mockResolvedValue(fakeSession(attacker));
      await expect(
        submitAndFinalize(attacker, {
          attemptId: attempt.id,
          answers: [{ questionId: attempt.questions[0]!.questionId, selectedOptionId: null }],
        }),
      ).rejects.toThrow();
    });

    it("usuário não consegue ler o resultado de outro usuário", async () => {
      const owner = "sim-user-dono-3";
      const attacker = "sim-user-atacante-3";
      authMock.mockResolvedValue(fakeSession(owner));

      const attempt = await createAttempt(owner, cfg({ mockExamId: MOCK_EXAM_IDS.direitoPenal }));
      await submitAndFinalize(owner, {
        attemptId: attempt.id,
        answers: attempt.questions.map((q) => ({ questionId: q.questionId, selectedOptionId: null })),
      });

      authMock.mockResolvedValue(fakeSession(attacker));
      await expect(getResult(attacker, attempt.id)).rejects.toThrow();
    });
  });

  describe("getResult / getHistory", () => {
    it("getResult rejeita ler o resultado de uma tentativa ainda em andamento", async () => {
      const userId = "sim-user-em-andamento";
      authMock.mockResolvedValue(fakeSession(userId));
      const attempt = await createAttempt(userId, cfg({ mockExamId: MOCK_EXAM_IDS.direitoPenal }));

      await expect(getResult(userId, attempt.id)).rejects.toThrow();
    });

    it("getHistory lista as tentativas do usuário, mais recente primeiro", async () => {
      const userId = "sim-user-historico";
      authMock.mockResolvedValue(fakeSession(userId));

      const first = await createAttempt(userId, cfg({ mockExamId: MOCK_EXAM_IDS.direitoPenal }));
      vi.setSystemTime(BASE_TIME + 60_000);
      const second = await createAttempt(userId, cfg({ mockExamId: MOCK_EXAM_IDS.direitoPenal }));

      const history = await getHistory(userId);
      expect(history[0]?.attemptId).toBe(second.id);
      expect(history[1]?.attemptId).toBe(first.id);
    });
  });

  describe("estado terminal EXPIRED — sem loop de redirect (segurança Fase 10 — MÉDIO)", () => {
    it("tentativa expirada: status é EXPIRED e AMBAS as leituras (resolução e resultado) dão CONFLICT", async () => {
      const userId = "sim-user-terminal";
      authMock.mockResolvedValue(fakeSession(userId));

      const attempt = await createAttempt(
        userId,
        cfg({ mockExamId: MOCK_EXAM_IDS.direitoPenal, timeLimitMinutes: 1 }),
      );

      // Estoura o tempo (100s > 60s + 30s de tolerância) → submissão expira a tentativa.
      vi.setSystemTime(BASE_TIME + 100_000);
      await expect(
        submitAndFinalize(userId, {
          attemptId: attempt.id,
          answers: attempt.questions.map((q) => ({ questionId: q.questionId, selectedOptionId: null })),
        }),
      ).rejects.toThrow();

      // O roteamento das telas usa `getAttemptStatus` (status explícito) para renderizar o estado
      // terminal em vez de redirecionar uma página para a outra às cegas.
      const status = await getAttemptStatus(userId, attempt.id);
      expect(status.status).toBe("EXPIRED");
      expect(status.mockExamId).toBe(attempt.mockExamId);
      // A DTO de status não carrega questões/gabarito (seguro para exibir no estado terminal).
      expect(JSON.stringify(status)).not.toContain("isCorrect");
      expect(JSON.stringify(status)).not.toContain("statement");

      // Nenhuma das duas leituras "de tela" tem sucesso — ambas dão CONFLICT (não NOT_FOUND),
      // então cada página cai no ramo de status→terminal, sem redirecionar para a outra (o que
      // causava o loop de ERR_TOO_MANY_REDIRECTS antes da correção).
      await expect(getAttemptForTaking(userId, attempt.id)).rejects.toMatchObject({ code: "CONFLICT" });
      await expect(getResult(userId, attempt.id)).rejects.toMatchObject({ code: "CONFLICT" });
    });
  });

  describe("simulado ad-hoc não vaza no catálogo (segurança Fase 10 — MÉDIO)", () => {
    it("o simulado personalizado de A não aparece no catálogo e B não consegue iniciá-lo por id", async () => {
      const userA = "sim-user-ad-hoc-a";
      const userB = "sim-user-ad-hoc-b";

      // A monta um simulado personalizado (sem mockExamId → cria um MockExam ad-hoc pessoal).
      authMock.mockResolvedValue(fakeSession(userA));
      const attemptA = await createAttempt(userA, cfg({ subjectId: SUBJECT_IDS.direitoPenal, quantity: 3 }));
      const adHocExamId = attemptA.mockExamId;
      expect(adHocExamId.startsWith("mock-exam-custom-")).toBe(true);

      // O catálogo compartilhado NÃO inclui o simulado pessoal de A.
      const catalog = await listMockExamCatalog();
      expect(catalog.some((exam) => exam.id === adHocExamId)).toBe(false);
      // O catálogo continua trazendo os simulados de catálogo reais.
      expect(catalog.some((exam) => exam.id === MOCK_EXAM_IDS.direitoPenal)).toBe(true);

      // B (outro usuário) não consegue iniciar uma tentativa sobre o ad-hoc de A adivinhando o id.
      authMock.mockResolvedValue(fakeSession(userB));
      await expect(
        createAttempt(userB, cfg({ mockExamId: adHocExamId })),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("expiração: auditoria correta (segurança Fase 10 — BAIXO)", () => {
    it("uma expiração real audita 'attempt-expired' exatamente uma vez para a tentativa", async () => {
      const userId = "sim-user-audit-expira";
      authMock.mockResolvedValue(fakeSession(userId));

      const attempt = await createAttempt(
        userId,
        cfg({ mockExamId: MOCK_EXAM_IDS.direitoPenal, timeLimitMinutes: 1 }),
      );

      // O store de auditoria é global ao processo e os ids de tentativa mock se repetem entre
      // testes — então medimos o DELTA causado por ESTA expiração, não a contagem absoluta.
      const expiredAuditsFor = () =>
        getAuditRecords().filter(
          (record) => record.operation === "simulations.attempt-expired" && record.entityId === attempt.id,
        );
      const before = expiredAuditsFor().length;

      vi.setSystemTime(BASE_TIME + 100_000);
      await expect(
        submitAndFinalize(userId, {
          attemptId: attempt.id,
          answers: attempt.questions.map((q) => ({ questionId: q.questionId, selectedOptionId: null })),
        }),
      ).rejects.toThrow();

      const after = expiredAuditsFor();
      // Exatamente UMA nova auditoria de expiração por esta chamada (nunca duplicada nem omitida).
      expect(after.length - before).toBe(1);
      // A expiração é uma transição registrada com sucesso — não um "failure" enganoso.
      expect(after[after.length - 1]?.result).toBe("success");
    });
  });
});
