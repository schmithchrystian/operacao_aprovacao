import { describe, expect, it } from "vitest";
import {
  buildPeriodWindow,
  buildScopeKey,
  discoverScopesFromParticipants,
  selectCandidatesForScope,
} from "@/server/services/gamification/ranking/scope";
import type { RankingParticipantEntity } from "@/mocks/data/ranking-participants";

function fixtureParticipant(overrides: Partial<RankingParticipantEntity>): RankingParticipantEntity {
  return {
    userId: "user-x",
    displayName: "Fulano de Tal",
    avatarUrl: null,
    city: "São Paulo",
    state: "SP",
    contestId: "contest-pm-soldado",
    contestName: "Polícia Militar — Soldado",
    courseId: "course-1",
    isProfilePublic: true,
    showInRanking: true,
    showRealName: true,
    showCityState: true,
    mockExamAccuracyPercent: 50,
    mockGoalsCompletedCount: 2,
    fallbackLessonsCompleted: 10,
    fallbackValidHours: 5,
    fallbackConsistency: 0.5,
    fallbackPoints: 1000,
    firstActivityAt: "2026-01-01T00:00:00.000Z",
    lastActivityAt: "2026-01-10T00:00:00.000Z",
    ...overrides,
  };
}

describe("ranking/scope — buildScopeKey", () => {
  it("normaliza cada tipo de escopo para a scopeKey NÃO NULA gravada (docs/DATA-MODEL.md)", () => {
    expect(buildScopeKey("GLOBAL", "ignorado")).toBe("global");
    expect(buildScopeKey("CONTEST", "contest-pm-soldado")).toBe("contest:contest-pm-soldado");
    expect(buildScopeKey("COURSE", "course-1")).toBe("course:course-1");
    expect(buildScopeKey("CITY", "São Paulo")).toBe("city:são paulo");
    expect(buildScopeKey("STATE", "SP")).toBe("state:sp");
  });
});

describe("ranking/scope — buildPeriodWindow", () => {
  it("é determinístico: a mesma referenceDate sempre gera a mesma periodKey/janela", () => {
    const reference = new Date("2026-03-17T10:00:00.000Z");
    const first = buildPeriodWindow("WEEKLY", reference);
    const second = buildPeriodWindow("WEEKLY", reference);
    expect(first).toEqual(second);
  });

  it("formatos de periodKey por tipo de período", () => {
    const reference = new Date("2026-03-17T10:00:00.000Z"); // terça-feira
    expect(buildPeriodWindow("DAILY", reference).periodKey).toBe("2026-03-17");
    expect(buildPeriodWindow("MONTHLY", reference).periodKey).toBe("2026-03");
    expect(buildPeriodWindow("ALL_TIME", reference).periodKey).toBe("all");
    expect(buildPeriodWindow("WEEKLY", reference).periodKey).toMatch(/^2026-W\d{2}$/);
  });

  it("ALL_TIME não tem totalDays fixo (null) — os demais têm", () => {
    const reference = new Date("2026-03-17T10:00:00.000Z");
    expect(buildPeriodWindow("ALL_TIME", reference).totalDays).toBeNull();
    expect(buildPeriodWindow("DAILY", reference).totalDays).toBe(1);
    expect(buildPeriodWindow("WEEKLY", reference).totalDays).toBe(7);
    expect(buildPeriodWindow("MONTHLY", reference).totalDays).toBeGreaterThanOrEqual(28);
  });
});

describe("ranking/scope — selectCandidatesForScope", () => {
  const participants: RankingParticipantEntity[] = [
    fixtureParticipant({ userId: "u1", contestId: "contest-pm-soldado", courseId: "course-1", city: "São Paulo", state: "SP" }),
    fixtureParticipant({ userId: "u2", contestId: "contest-gcm-agente", courseId: "course-2", city: "Recife", state: "PE" }),
    fixtureParticipant({ userId: "u3", contestId: null, courseId: null, city: null, state: null }),
  ];

  it("GLOBAL inclui todos os participantes", () => {
    expect(selectCandidatesForScope(participants, "GLOBAL", "global").map((p) => p.userId)).toEqual(["u1", "u2", "u3"]);
  });

  it("CONTEST/COURSE/CITY/STATE filtram só quem pertence ao escopo", () => {
    expect(selectCandidatesForScope(participants, "CONTEST", "contest-pm-soldado").map((p) => p.userId)).toEqual(["u1"]);
    expect(selectCandidatesForScope(participants, "COURSE", "course-2").map((p) => p.userId)).toEqual(["u2"]);
    expect(selectCandidatesForScope(participants, "CITY", "recife").map((p) => p.userId)).toEqual(["u2"]); // case-insensitive
    expect(selectCandidatesForScope(participants, "STATE", "sp").map((p) => p.userId)).toEqual(["u1"]);
  });

  it("escopo sem correspondência devolve lista vazia (nunca lança)", () => {
    expect(selectCandidatesForScope(participants, "CONTEST", "contest-inexistente")).toEqual([]);
  });
});

describe("ranking/scope — discoverScopesFromParticipants", () => {
  it("sempre inclui GLOBAL e descobre concurso/curso/cidade/estado distintos", () => {
    const participants: RankingParticipantEntity[] = [
      fixtureParticipant({ userId: "u1", contestId: "contest-a", courseId: "course-a", city: "Cidade A", state: "AA" }),
      fixtureParticipant({ userId: "u2", contestId: "contest-a", courseId: "course-a", city: "Cidade A", state: "AA" }), // duplicado
      fixtureParticipant({ userId: "u3", contestId: "contest-b", courseId: "course-b", city: "Cidade B", state: "BB" }),
    ];
    const scopes = discoverScopesFromParticipants(participants);
    expect(scopes).toContainEqual({ scopeType: "GLOBAL", scopeKeyRaw: "global" });
    expect(scopes.filter((s) => s.scopeType === "CONTEST")).toHaveLength(2);
    expect(scopes.filter((s) => s.scopeType === "COURSE")).toHaveLength(2);
    expect(scopes.filter((s) => s.scopeType === "CITY")).toHaveLength(2);
    expect(scopes.filter((s) => s.scopeType === "STATE")).toHaveLength(2);
  });
});
