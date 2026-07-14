import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session as NextAuthSession } from "next-auth";
import type { ProfileAggregatesDTO } from "@/contracts/profile";
import type { ProfileEntity } from "@/server/repositories/contracts/profile-repository";

// `profile/*` -> `@/server/authorization` -> `@/server/auth` (Auth.js). Mockar ANTES de
// importar o módulo sob teste — mesmo padrão de `tests/unit/dashboard-service.test.ts`.
const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("@/server/auth", () => ({ auth: authMock }));

const {
  getOwnProfile,
  getPublicProfile,
  updateProfile,
  updatePrivacy,
  getOrCreateProfile,
  maskAggregatesForVisitor,
} = await import("@/server/services/profile");
const { anonymizedRankingName, ACHIEVEMENTS } = await import("@/server/services/gamification");
const { getRepositories } = await import("@/server/repositories");
const { getAuditRecords } = await import("@/server/audit");
const { __resetMockProfileStore } = await import("@/server/repositories/mock/profile-repository");
const { __resetMockRankingScoreStore } = await import("@/server/repositories/mock/ranking-score-repository");

function fakeSession(id: string): NextAuthSession {
  return {
    user: { id, role: "aluno", name: "Teste", email: "teste@example.com" },
    expires: new Date(Date.now() + 60_000).toISOString(),
  } as NextAuthSession;
}

const NOW = new Date("2026-07-14T10:00:00.000Z");

/**
 * Testes de serviço (Fase 16 — CLAUDE.md §11/§24): privacidade aplicada SEMPRE no servidor
 * (nunca confiando no frontend para esconder campo), ownership/IDOR, agregados corretos
 * (reaproveitando gamificação/ranking/tracking reais) e auditoria de escrita.
 */
describe("services/profile", () => {
  beforeEach(() => {
    authMock.mockReset();
    __resetMockProfileStore();
    __resetMockRankingScoreStore();
  });

  describe("maskAggregatesForVisitor — máscara pura, sem I/O", () => {
    const fullAggregates: ProfileAggregatesDTO = {
      level: { index: 3, name: "Combatente" },
      points: 4200,
      xp: 4200,
      rankingPosition: 5,
      rankingTotalParticipants: 50,
      studyHours: 42.5,
      lessonsCompleted: 30,
      mockExamsCompleted: 4,
      averageMockExamScorePercent: 81.5,
      streakDays: 12,
      achievementsUnlockedCount: 6,
      achievementsTotalCount: 18,
      recentAchievements: [{ key: "first-victory", name: "Primeira vitória", icon: "Star", unlockedAt: "2026-06-01T00:00:00.000Z" }],
    };

    function profileWithFlags(flags: Partial<ProfileEntity>): ProfileEntity {
      return {
        id: "profile-x",
        userId: "user-x",
        bio: null,
        avatarUrl: null,
        phone: null,
        birthDate: null,
        city: null,
        state: null,
        targetContestId: null,
        isProfilePublic: true,
        showInRanking: true,
        showRealName: true,
        showCityState: true,
        showStudyHours: true,
        showPerformance: true,
        createdAt: NOW.toISOString(),
        updatedAt: NOW.toISOString(),
        ...flags,
      };
    }

    it("com todas as flags ligadas, não altera nenhum campo", () => {
      const masked = maskAggregatesForVisitor(fullAggregates, profileWithFlags({}));
      expect(masked).toEqual(fullAggregates);
    });

    it("showInRanking desligado esconde só rankingPosition/rankingTotalParticipants", () => {
      const masked = maskAggregatesForVisitor(fullAggregates, profileWithFlags({ showInRanking: false }));
      expect(masked.rankingPosition).toBeNull();
      expect(masked.rankingTotalParticipants).toBeNull();
      expect(masked.studyHours).toBe(fullAggregates.studyHours);
      expect(masked.averageMockExamScorePercent).toBe(fullAggregates.averageMockExamScorePercent);
      expect(masked.points).toBe(fullAggregates.points);
    });

    it("showStudyHours desligado esconde horas/aulas/simulados/sequência, mas não desempenho nem ranking", () => {
      const masked = maskAggregatesForVisitor(fullAggregates, profileWithFlags({ showStudyHours: false }));
      expect(masked.studyHours).toBeNull();
      expect(masked.lessonsCompleted).toBeNull();
      expect(masked.mockExamsCompleted).toBeNull();
      // Achado B2: `streakDays` é métrica de esforço, segue a mesma flag das horas.
      expect(masked.streakDays).toBeNull();
      expect(masked.averageMockExamScorePercent).toBe(fullAggregates.averageMockExamScorePercent);
      expect(masked.rankingPosition).toBe(fullAggregates.rankingPosition);
    });

    it("showPerformance desligado esconde só a média de simulados", () => {
      const masked = maskAggregatesForVisitor(fullAggregates, profileWithFlags({ showPerformance: false }));
      expect(masked.averageMockExamScorePercent).toBeNull();
      expect(masked.studyHours).toBe(fullAggregates.studyHours);
      expect(masked.lessonsCompleted).toBe(fullAggregates.lessonsCompleted);
      expect(masked.streakDays).toBe(fullAggregates.streakDays); // desempenho off não afeta sequência
    });

    it("nunca mascara level/points/xp/conquistas (sem flag dedicada)", () => {
      const masked = maskAggregatesForVisitor(
        fullAggregates,
        profileWithFlags({ showInRanking: false, showStudyHours: false, showPerformance: false }),
      );
      expect(masked.level).toEqual(fullAggregates.level);
      expect(masked.points).toBe(fullAggregates.points);
      expect(masked.xp).toBe(fullAggregates.xp);
      expect(masked.achievementsUnlockedCount).toBe(fullAggregates.achievementsUnlockedCount);
      expect(masked.recentAchievements).toEqual(fullAggregates.recentAchievements);
    });
  });

  describe("getOrCreateProfile — get-or-create idempotente, fail-closed", () => {
    it("cria uma única vez com defaults fail-closed e nunca duplica", async () => {
      const created = await getOrCreateProfile("brand-new-user-without-seed", NOW);
      expect(created.isProfilePublic).toBe(false); // fail-closed
      expect(created.showInRanking).toBe(true);
      expect(created.showRealName).toBe(true);
      expect(created.showCityState).toBe(true);

      const again = await getOrCreateProfile("brand-new-user-without-seed", new Date("2026-08-01T00:00:00.000Z"));
      expect(again.id).toBe(created.id);
      expect(again.createdAt).toBe(created.createdAt); // não recriou/sobrescreveu
    });
  });

  describe("getOwnProfile — o dono sempre vê tudo", () => {
    it("agrega perfil + gamificação + ranking + simulados reais de user-1", async () => {
      authMock.mockResolvedValue(fakeSession("user-1"));

      const profile = await getOwnProfile("user-1");

      expect(profile.isOwnProfile).toBe(true);
      expect(profile.isPublic).toBe(true);
      expect(profile.name).toBe("Ana Recruta");
      expect(profile.city).toBe("São Paulo");
      expect(profile.state).toBe("SP");
      expect(profile.mainContest).toEqual({ contestId: "contest-pm-soldado", contestName: "Polícia Militar — Soldado" });
      expect(profile.interestedContests.some((c) => c.contestId === "contest-pm-soldado")).toBe(true);
      expect(profile.privacy).not.toBeNull();
      expect(profile.privacy!.showInRanking).toBe(true);

      expect(profile.aggregates).not.toBeNull();
      // Único simulado finalizado do seed (`mock-exam-attempts.ts`): 75% — reaproveitado, não
      // recomputado (mesma fórmula de `ranking/metrics.ts#computeMockExamPerformance`).
      expect(profile.aggregates!.averageMockExamScorePercent).toBe(75);
      expect(profile.aggregates!.achievementsTotalCount).toBe(ACHIEVEMENTS.length);
      expect(profile.aggregates!.achievementsUnlockedCount).toBeGreaterThanOrEqual(3);
      expect(profile.aggregates!.points).toBeGreaterThan(0);
    });

    it("anti-IDOR: rejeita ler o perfil de outro usuário via getOwnProfile", async () => {
      authMock.mockResolvedValue(fakeSession("user-2"));
      await expect(getOwnProfile("user-1")).rejects.toThrow();
    });

    it("exige sessão autenticada", async () => {
      authMock.mockResolvedValue(null);
      await expect(getOwnProfile("user-1")).rejects.toThrow();
    });
  });

  describe("getPublicProfile — perfil de outro usuário, privacidade aplicada no servidor", () => {
    it("perfil fechado (isProfilePublic=false): visitante não vê nada além do fechamento", async () => {
      authMock.mockResolvedValue(fakeSession("user-1"));

      const view = await getPublicProfile("user-1", "user-4");

      expect(view.isOwnProfile).toBe(false);
      expect(view.isPublic).toBe(false);
      expect(view.name).toBeNull();
      expect(view.city).toBeNull();
      expect(view.mainContest).toBeNull();
      expect(view.interestedContests).toEqual([]);
      expect(view.aggregates).toBeNull();
      expect(view.privacy).toBeNull();
    });

    it("perfil público com showRealName=false: nome anonimizado, cidade/estado visíveis", async () => {
      authMock.mockResolvedValue(fakeSession("user-1"));

      const view = await getPublicProfile("user-1", "user-3");

      expect(view.isPublic).toBe(true);
      expect(view.name).toBe(anonymizedRankingName("user-3"));
      expect(view.city).toBe("Rio de Janeiro");
      expect(view.state).toBe("RJ");
      expect(view.privacy).toBeNull(); // visitante nunca vê as flags cruas de outro usuário
    });

    it("perfil público com showPerformance=false: média de simulados escondida do visitante", async () => {
      authMock.mockResolvedValue(fakeSession("user-1"));

      const view = await getPublicProfile("user-1", "user-3");

      expect(view.aggregates).not.toBeNull();
      expect(view.aggregates!.averageMockExamScorePercent).toBeNull();
    });

    it("phone/birthDate NUNCA são expostos a um visitante, mesmo com valor real definido", async () => {
      authMock.mockResolvedValue(fakeSession("user-3"));
      await updateProfile("user-3", { phone: "11999998888", birthDate: "2000-01-01T00:00:00.000Z" });

      // O próprio dono vê o valor real.
      const own = await getOwnProfile("user-3");
      expect(own.phone).toBe("11999998888");
      expect(own.birthDate).toBe("2000-01-01T00:00:00.000Z");

      // Um visitante nunca vê, mesmo o perfil sendo público.
      authMock.mockResolvedValue(fakeSession("user-1"));
      const view = await getPublicProfile("user-1", "user-3");
      expect(view.isPublic).toBe(true);
      expect(view.phone).toBeNull();
      expect(view.birthDate).toBeNull();
    });

    it("opt-out de ranking (showInRanking=false): posição some do perfil público, mas o dono sempre a vê", async () => {
      const repos = getRepositories();
      await repos.rankingScores.upsert({
        userId: "user-2",
        periodType: "ALL_TIME",
        periodKey: "all",
        scopeType: "GLOBAL",
        scopeKey: "global",
        calculationVersion: 1,
        score: 0.5,
        rank: 7,
        breakdown: null,
        now: NOW,
      });

      // Perfil público de user-2 (isProfilePublic=true, showInRanking=false) visto por outro usuário.
      authMock.mockResolvedValue(fakeSession("user-1"));
      const view = await getPublicProfile("user-1", "user-2");
      expect(view.isPublic).toBe(true);
      expect(view.aggregates).not.toBeNull();
      expect(view.aggregates!.rankingPosition).toBeNull();
      expect(view.aggregates!.rankingTotalParticipants).toBeNull();

      // O próprio user-2 sempre vê a posição real, mesmo com o opt-out.
      authMock.mockResolvedValue(fakeSession("user-2"));
      const own = await getOwnProfile("user-2");
      expect(own.aggregates!.rankingPosition).toBe(7);
      expect(own.aggregates!.rankingTotalParticipants).toBe(1);
    });

    it("visitando o próprio id pela rota pública (SEM previewAsVisitor) devolve a visão COMPLETA", async () => {
      authMock.mockResolvedValue(fakeSession("user-4"));

      const view = await getPublicProfile("user-4", "user-4");

      expect(view.isOwnProfile).toBe(true);
      expect(view.isPublic).toBe(false); // reflete a flag real, mas não fecha a própria visão
      expect(view.aggregates).not.toBeNull();
      expect(view.privacy).not.toBeNull();
    });

    it("M1 previewAsVisitor: o dono vê a PRÓPRIA visão MASCARADA (nome anonimizado, desempenho oculto, privacy null)", async () => {
      authMock.mockResolvedValue(fakeSession("user-3")); // showRealName:false, showPerformance:false, público

      const preview = await getPublicProfile("user-3", "user-3", { previewAsVisitor: true });

      expect(preview.isOwnProfile).toBe(false); // é a visão de visitante, não a do dono
      expect(preview.isPublic).toBe(true);
      expect(preview.privacy).toBeNull(); // nunca as flags cruas na prévia
      expect(preview.name).toBe(anonymizedRankingName("user-3")); // showRealName: false
      expect(preview.phone).toBeNull();
      expect(preview.aggregates).not.toBeNull();
      expect(preview.aggregates!.averageMockExamScorePercent).toBeNull(); // showPerformance: false

      // Contraste: sem o flag, o próprio dono continua vendo tudo.
      const full = await getPublicProfile("user-3", "user-3");
      expect(full.isOwnProfile).toBe(true);
      expect(full.privacy).not.toBeNull();
    });

    it("M1 previewAsVisitor: dono de perfil FECHADO vê a prévia como 'fechado', não a visão completa", async () => {
      authMock.mockResolvedValue(fakeSession("user-4")); // isProfilePublic: false

      const preview = await getPublicProfile("user-4", "user-4", { previewAsVisitor: true });

      expect(preview.isPublic).toBe(false);
      expect(preview.aggregates).toBeNull();
      expect(preview.name).toBeNull();
      expect(preview.privacy).toBeNull();
    });

    it("M1 previewAsVisitor é no-op para não-dono: nunca revela dado de OUTRO usuário mascarado-a-menos", async () => {
      authMock.mockResolvedValue(fakeSession("user-1"));

      const withFlag = await getPublicProfile("user-1", "user-3", { previewAsVisitor: true });
      const withoutFlag = await getPublicProfile("user-1", "user-3");

      // Idêntico: o flag é irrelevante para o perfil de outro (visitante já é sempre mascarado).
      expect(withFlag.name).toBe(withoutFlag.name);
      expect(withFlag.name).toBe(anonymizedRankingName("user-3"));
      expect(withFlag.privacy).toBeNull();
      expect(withFlag.aggregates!.averageMockExamScorePercent).toBeNull();
    });

    it("rejeita alvo inexistente (404 de domínio)", async () => {
      authMock.mockResolvedValue(fakeSession("user-1"));
      await expect(getPublicProfile("user-1", "usuario-que-nao-existe")).rejects.toThrow();
    });

    it("anti-IDOR: rejeita quando o viewerId não corresponde à sessão real", async () => {
      authMock.mockResolvedValue(fakeSession("user-1"));
      await expect(getPublicProfile("user-2", "user-3")).rejects.toThrow();
    });

    it("exige sessão autenticada", async () => {
      authMock.mockResolvedValue(null);
      await expect(getPublicProfile("user-1", "user-3")).rejects.toThrow();
    });
  });

  describe("updateProfile — persiste e audita", () => {
    it("atualiza campos informados, preserva os omitidos e limpa com null explícito", async () => {
      authMock.mockResolvedValue(fakeSession("user-1"));

      const updated = await updateProfile("user-1", { bio: "Nova bio de estudos", city: "Campinas" }, NOW);
      expect(updated.bio).toBe("Nova bio de estudos");
      expect(updated.city).toBe("Campinas");
      expect(updated.state).toBe("SP"); // omitido -> preserva

      const cleared = await updateProfile("user-1", { bio: null }, NOW);
      expect(cleared.bio).toBeNull();

      const records = getAuditRecords();
      expect(records.some((r) => r.operation === "profile.update" && r.userId === "user-1" && r.result === "success")).toBe(true);
    });

    it("rejeita targetContestId de um concurso inexistente", async () => {
      authMock.mockResolvedValue(fakeSession("user-1"));
      await expect(updateProfile("user-1", { targetContestId: "contest-que-nao-existe" }, NOW)).rejects.toThrow();
    });

    it("anti-IDOR: rejeita atualizar o perfil de outro usuário", async () => {
      authMock.mockResolvedValue(fakeSession("user-1"));
      await expect(updateProfile("user-2", { bio: "hack" }, NOW)).rejects.toThrow();
    });
  });

  describe("updatePrivacy — persiste e audita", () => {
    it("atualiza só as flags informadas, preservando as demais", async () => {
      authMock.mockResolvedValue(fakeSession("user-3"));

      const updated = await updatePrivacy("user-3", { showRealName: true }, NOW);
      expect(updated.privacy!.showRealName).toBe(true);
      expect(updated.privacy!.showPerformance).toBe(false); // não informado -> preserva

      const records = getAuditRecords();
      expect(
        records.some((r) => r.operation === "profile.update-privacy" && r.userId === "user-3" && r.result === "success"),
      ).toBe(true);
    });

    it("anti-IDOR: rejeita atualizar a privacidade de outro usuário", async () => {
      authMock.mockResolvedValue(fakeSession("user-3"));
      await expect(updatePrivacy("user-1", { isProfilePublic: false }, NOW)).rejects.toThrow();
    });
  });
});
