import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session as NextAuthSession } from "next-auth";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock("@/server/auth", () => ({
  auth: authMock,
}));

// Importados após o mock de "@/server/auth" (usado por "@/server/authorization").
const { buildSession, startStudyMission } = await import("@/server/services/study-plan");
const { getRepositories } = await import("@/server/repositories");
const { SUBJECT_IDS } = await import("@/mocks");

/**
 * Testes de serviço (I/O) de "Montar estudo" (Fase 11 — CLAUDE.md §31 item 13): geração real
 * via repositórios mock, resolução de conteúdo real quando existe, fallback genérico quando
 * não existe, autorização e persistência da missão.
 */
function fakeSession(id: string): NextAuthSession {
  return {
    user: { id, role: "aluno", name: "Teste", email: "teste@example.com" },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as NextAuthSession;
}

describe("services/study-plan — buildSession", () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  it("soma dos blocos gerados é sempre igual ao tempo disponível informado", async () => {
    const userId = "session-sum";
    authMock.mockResolvedValue(fakeSession(userId));

    const generated = await buildSession(userId, {
      contentTypes: ["videoaula", "questoes", "flashcards", "revisao"],
      availableMinutes: 60,
    });

    expect(generated.totalMinutes).toBe(60);
    expect(generated.blocks.reduce((sum, block) => sum + block.minutes, 0)).toBe(60);
  });

  it("resolve uma aula real (próxima não concluída) quando courseId/subjectId casam com o catálogo", async () => {
    const userId = "session-lesson-real";
    authMock.mockResolvedValue(fakeSession(userId));

    const generated = await buildSession(userId, {
      courseId: "course-1",
      subjectId: SUBJECT_IDS.linguaPortuguesa,
      contentTypes: ["videoaula"],
      availableMinutes: 30,
    });

    const block = generated.blocks[0]!;
    expect(block.type).toBe("videoaula");
    expect(block.contentRef).not.toBeNull();
    expect(block.contentRef?.kind).toBe("lesson");
    // "Interpretação de texto" — 1ª aula do módulo de Língua Portuguesa, SEMPRE disponível
    // (Regra 1 de `computeCourseProgress`) mesmo para um usuário sem nenhum progresso registrado.
    expect(block.contentRef?.id).toBe("course-1-m1-l1");
  });

  it("cai para bloco genérico quando o tipo de conteúdo não tem repositório nesta fase (flashcards)", async () => {
    const userId = "session-generic";
    authMock.mockResolvedValue(fakeSession(userId));

    const generated = await buildSession(userId, {
      contentTypes: ["flashcards"],
      availableMinutes: 20,
    });

    expect(generated.blocks[0]!.contentRef).toBeNull();
    expect(generated.blocks[0]!.title.length).toBeGreaterThan(0);
  });

  it("cai para bloco genérico de questões quando nenhum filtro de matéria/assunto é informado", async () => {
    const userId = "session-questions-generic";
    authMock.mockResolvedValue(fakeSession(userId));

    const generated = await buildSession(userId, {
      contentTypes: ["questoes"],
      availableMinutes: 20,
    });

    expect(generated.blocks[0]!.contentRef).toBeNull();
  });

  it("resolve um conjunto real de questões quando a matéria tem questões publicadas no banco mock", async () => {
    const userId = "session-questions-real";
    authMock.mockResolvedValue(fakeSession(userId));

    const generated = await buildSession(userId, {
      subjectId: SUBJECT_IDS.direitoPenal,
      contentTypes: ["questoes"],
      availableMinutes: 20,
    });

    expect(generated.blocks[0]!.contentRef?.kind).toBe("question_set");
  });

  it("rejeita montar sessão para outro usuário (anti-IDOR — assertOwnership)", async () => {
    authMock.mockResolvedValue(fakeSession("session-me"));

    await expect(
      buildSession("session-someone-else", { contentTypes: ["videoaula"], availableMinutes: 30 }),
    ).rejects.toThrow();
  });
});

describe("services/study-plan — startStudyMission", () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  it("persiste a missão e devolve o 1º bloco como ponto de partida", async () => {
    const userId = "mission-start-1";
    authMock.mockResolvedValue(fakeSession(userId));

    const result = await startStudyMission(userId, {
      contentTypes: ["videoaula", "questoes"],
      availableMinutes: 40,
    });

    expect(result.mission.status).toBe("ACTIVE");
    expect(result.mission.blocks).toHaveLength(2);
    expect(result.startingBlock).toEqual(result.mission.blocks[0]);
    expect(result.mission.currentBlockIndex).toBe(0);

    const stored = await getRepositories().studyMissions.findById(userId, result.mission.id);
    expect(stored).not.toBeNull();
    expect(stored?.userId).toBe(userId);
    expect(stored?.totalMinutes).toBe(40);
  });

  it("geração é determinística — o mesmo filtro produz a mesma alocação de minutos", async () => {
    const userId = "mission-deterministic";
    authMock.mockResolvedValue(fakeSession(userId));

    const first = await startStudyMission(userId, { contentTypes: ["videoaula", "questoes"], availableMinutes: 50 });
    const second = await startStudyMission(userId, { contentTypes: ["videoaula", "questoes"], availableMinutes: 50 });

    expect(second.mission.blocks.map((b) => b.minutes)).toEqual(first.mission.blocks.map((b) => b.minutes));
  });

  it("rejeita iniciar missão para outro usuário (anti-IDOR)", async () => {
    authMock.mockResolvedValue(fakeSession("mission-me"));

    await expect(
      startStudyMission("mission-someone-else", { contentTypes: ["videoaula"], availableMinutes: 30 }),
    ).rejects.toThrow();
  });
});
