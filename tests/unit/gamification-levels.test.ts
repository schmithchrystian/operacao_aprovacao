import { describe, expect, it } from "vitest";
// Import direto do submódulo (não o barrel `@/server/services/gamification`): `levels.ts` é
// puro e não depende de autorização/auth — importar o barrel puxaria `read.ts`/`auth`
// desnecessariamente para este teste.
import { computeLevel, LEVELS } from "@/server/services/gamification/levels";

/**
 * Testes do núcleo puro de níveis (Fase 8 — CLAUDE.md §16/§25). `computeLevel` não faz I/O
 * nem lê o relógio — só depende do XP recebido.
 */
describe("computeLevel — limiares e nível máximo", () => {
  it("XP 0 fica no nível 1 (Recruta), com próximo nível definido", () => {
    const result = computeLevel(0);

    expect(result.level.name).toBe("Recruta");
    expect(result.currentLevelXp).toBe(0);
    expect(result.nextLevelXp).toBe(1000);
    expect(result.progressPercent).toBe(0);
  });

  it("XP exatamente no limiar de um nível já conta para esse nível (inclusive)", () => {
    const result = computeLevel(1000);
    expect(result.level.name).toBe("Aspirante");
  });

  it("XP um ponto abaixo do limiar ainda fica no nível anterior", () => {
    const result = computeLevel(999);
    expect(result.level.name).toBe("Recruta");
  });

  it("nível máximo (Comandante) não possui próximo nível", () => {
    const result = computeLevel(15000);

    expect(result.level.name).toBe("Comandante");
    expect(result.nextLevelXp).toBeNull();
    expect(result.xpToNextLevel).toBeNull();
    expect(result.progressPercent).toBe(100);
  });

  it("XP muito acima do máximo permanece em Comandante (não estoura o array)", () => {
    const result = computeLevel(999_999);
    expect(result.level.name).toBe("Comandante");
  });

  it("XP negativo é tratado como 0 (defesa em profundidade)", () => {
    const result = computeLevel(-500);
    expect(result.level.name).toBe("Recruta");
    expect(result.progressPercent).toBe(0);
  });

  it("progresso dentro da faixa é proporcional ao XP acumulado", () => {
    // Aspirante (1000) -> Combatente (2500): banda de 1500. XP 1750 = 750 dentro da banda = 50%.
    const result = computeLevel(1750);

    expect(result.level.name).toBe("Aspirante");
    expect(result.progressPercent).toBeCloseTo(50, 5);
    expect(result.xpToNextLevel).toBe(750);
  });

  it("todos os 7 níveis têm limiares estritamente crescentes", () => {
    for (let i = 1; i < LEVELS.length; i += 1) {
      expect(LEVELS[i]!.minXp).toBeGreaterThan(LEVELS[i - 1]!.minXp);
    }
    expect(LEVELS).toHaveLength(7);
  });
});
