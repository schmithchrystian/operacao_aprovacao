import { describe, expect, it } from "vitest";
// Import direto do submódulo (não o barrel `@/server/services/gamification`): `achievements.ts`
// é puro e não depende de autorização/auth — importar o barrel puxaria `read.ts`/`auth`
// desnecessariamente para este teste.
import {
  ACHIEVEMENTS,
  evaluateAchievements,
  type UserGamificationStats,
} from "@/server/services/gamification/achievements";

/**
 * Testes do núcleo puro de conquistas (Fase 8 — CLAUDE.md §15/§25). `evaluateAchievements`
 * não faz I/O — só compara `UserGamificationStats` contra os critérios e o conjunto já
 * desbloqueado.
 */
function baseStats(overrides: Partial<UserGamificationStats> = {}): UserGamificationStats {
  return {
    lessonsCompleted: 0,
    firstWeekFullyActive: false,
    streakDays: 0,
    mockExamsCompleted: 0,
    bestMockExamAccuracyPercent: 0,
    mockExamsAboveAccuracyThreshold: 0,
    questionsCorrect: 0,
    studyHours: 0,
    flashcardsMastered: 0,
    weeklyGoalsCompleted: 0,
    ...overrides,
  };
}

describe("evaluateAchievements — critérios e idempotência", () => {
  it("com stats zerados, nenhuma conquista é desbloqueada", () => {
    const result = evaluateAchievements(baseStats(), []);
    expect(result).toHaveLength(0);
  });

  it("a 1ª aula concluída desbloqueia 'Primeira vitória' mas não '10 aulas'", () => {
    const result = evaluateAchievements(baseStats({ lessonsCompleted: 1 }), []);
    const keys = result.map((a) => a.key);

    expect(keys).toContain("first-victory");
    expect(keys).not.toContain("lessons-10");
  });

  it("10/50/100 aulas desbloqueiam as respectivas conquistas cumulativamente", () => {
    const result = evaluateAchievements(baseStats({ lessonsCompleted: 100 }), []);
    const keys = result.map((a) => a.key);

    expect(keys).toEqual(
      expect.arrayContaining(["first-victory", "lessons-10", "lessons-50", "lessons-100"]),
    );
  });

  it("já desbloqueadas (`alreadyUnlockedKeys`) nunca são devolvidas de novo — IDEMPOTENTE", () => {
    const stats = baseStats({ lessonsCompleted: 1 });

    const first = evaluateAchievements(stats, []);
    expect(first.map((a) => a.key)).toContain("first-victory");

    // Mesma chamada de novo, agora informando que "first-victory" já foi persistida — não
    // deve reaparecer, mesmo com o MESMO stats (nunca desbloqueia a mesma conquista 2x).
    const second = evaluateAchievements(stats, ["first-victory"]);
    expect(second.map((a) => a.key)).not.toContain("first-victory");
  });

  it("chamar duas vezes seguidas com o mesmo estado e o mesmo já-desbloqueado é estável", () => {
    const stats = baseStats({ lessonsCompleted: 10 });
    const alreadyUnlocked = ["first-victory", "lessons-10"];

    const resultA = evaluateAchievements(stats, alreadyUnlocked);
    const resultB = evaluateAchievements(stats, alreadyUnlocked);

    expect(resultA).toEqual(resultB);
    expect(resultA).toHaveLength(0);
  });

  it("'Primeira semana completa' depende de firstWeekFullyActive, não de streakDays", () => {
    // Streak alto mas sem a 1ª semana totalmente ativa — não desbloqueia.
    const withoutFirstWeek = evaluateAchievements(baseStats({ streakDays: 30 }), []);
    expect(withoutFirstWeek.map((a) => a.key)).not.toContain("first-week-complete");

    const withFirstWeek = evaluateAchievements(baseStats({ firstWeekFullyActive: true }), []);
    expect(withFirstWeek.map((a) => a.key)).toContain("first-week-complete");
  });

  it("acurácia >80% e >90% são critérios estritamente maiores (não inclusive)", () => {
    const at80 = evaluateAchievements(baseStats({ bestMockExamAccuracyPercent: 80 }), []);
    expect(at80.map((a) => a.key)).not.toContain("accuracy-80");

    const above80 = evaluateAchievements(baseStats({ bestMockExamAccuracyPercent: 81 }), []);
    expect(above80.map((a) => a.key)).toContain("accuracy-80");
    expect(above80.map((a) => a.key)).not.toContain("accuracy-90");

    const above90 = evaluateAchievements(baseStats({ bestMockExamAccuracyPercent: 95 }), []);
    expect(above90.map((a) => a.key)).toEqual(expect.arrayContaining(["accuracy-80", "accuracy-90"]));
  });

  it("existem exatamente 18 conquistas definidas, todas com chave única", () => {
    expect(ACHIEVEMENTS).toHaveLength(18);
    const keys = ACHIEVEMENTS.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
