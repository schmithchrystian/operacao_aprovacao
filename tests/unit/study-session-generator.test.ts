import { describe, expect, it } from "vitest";
import type { StudySessionContentType } from "@/config/business";
import { allocateSessionMinutes } from "@/server/services/study-plan/session-generator";

/**
 * Testes do núcleo PURO de alocação de "Montar estudo" (Fase 11 — CLAUDE.md §31 item 13).
 * Sem I/O — só a regra de alocação sobre tipos/pesos sintéticos, determinística.
 */
describe("session-generator/allocateSessionMinutes", () => {
  it("cenário de referência: 60min + videoaula/questoes/flashcards/revisao (pesos 5/3/2/2) = 25/15/10/10", () => {
    const blocks = allocateSessionMinutes(60, ["videoaula", "questoes", "flashcards", "revisao"]);

    expect(blocks.map((block) => [block.type, block.minutes])).toEqual([
      ["videoaula", 25],
      ["questoes", 15],
      ["flashcards", 10],
      ["revisao", 10],
    ]);
  });

  it("a soma dos blocos é sempre exatamente `availableMinutes`, com ou sem arredondamento", () => {
    const scenarios: Array<[number, StudySessionContentType[]]> = [
      [60, ["videoaula", "questoes", "flashcards", "revisao"]],
      [50, ["videoaula", "questoes", "flashcards"]],
      [37, ["videoaula", "pdf", "questoes", "flashcards", "revisao", "simulado", "resumo", "mapa_mental"]],
      [125, ["videoaula", "simulado"]],
    ];

    for (const [minutes, types] of scenarios) {
      const blocks = allocateSessionMinutes(minutes, types);
      const total = blocks.reduce((sum, block) => sum + block.minutes, 0);
      expect(total).toBe(minutes);
    }
  });

  it("aloca somente os tipos escolhidos — nenhum bloco extra, nenhum faltando", () => {
    const chosen: StudySessionContentType[] = ["questoes", "revisao"];
    const blocks = allocateSessionMinutes(60, chosen);

    expect(blocks).toHaveLength(2);
    expect(new Set(blocks.map((block) => block.type))).toEqual(new Set(chosen));
  });

  it("reordena os blocos pela ordem pedagógica configurada, independente da ordem de entrada", () => {
    // Entrada em ordem "invertida" em relação a STUDY_SESSION_BLOCK_ORDER.
    const blocks = allocateSessionMinutes(40, ["revisao", "flashcards", "videoaula"]);
    expect(blocks.map((block) => block.type)).toEqual(["videoaula", "flashcards", "revisao"]);
  });

  it("tipo duplicado na entrada não duplica o bloco de saída", () => {
    const blocks = allocateSessionMinutes(60, ["videoaula", "videoaula", "questoes"]);
    expect(blocks).toHaveLength(2);
  });

  it("um único tipo recebe o tempo disponível inteiro", () => {
    const blocks = allocateSessionMinutes(45, ["videoaula"]);
    expect(blocks).toEqual([{ type: "videoaula", label: "Videoaula", minutes: 45 }]);
  });

  it("garante o mínimo por bloco quando o tempo total comporta (redistribui dos maiores)", () => {
    // Pesos bem desproporcionais (videoaula=5, mapa_mental=1) com poucos minutos: sem a
    // garantia de mínimo, mapa_mental ficaria abaixo de `STUDY_SESSION.minBlockMinutes` (5).
    const blocks = allocateSessionMinutes(18, ["videoaula", "mapa_mental"]);
    const total = blocks.reduce((sum, block) => sum + block.minutes, 0);

    expect(total).toBe(18);
    for (const block of blocks) {
      expect(block.minutes).toBeGreaterThanOrEqual(5);
    }
  });

  it("quando o tempo total NÃO comporta o mínimo para todos os tipos, mantém a alocação proporcional pura", () => {
    // 6 minutos para 3 tipos: impossível garantir 5min para cada — não deve lançar, nem travar.
    const blocks = allocateSessionMinutes(6, ["videoaula", "questoes", "flashcards"]);
    const total = blocks.reduce((sum, block) => sum + block.minutes, 0);

    expect(total).toBe(6);
    expect(blocks.every((block) => block.minutes >= 0)).toBe(true);
  });

  it("é determinística — mesma entrada sempre produz a mesma saída", () => {
    const first = allocateSessionMinutes(90, ["videoaula", "questoes", "simulado"]);
    const second = allocateSessionMinutes(90, ["videoaula", "questoes", "simulado"]);
    expect(first).toEqual(second);
  });

  it("respeita uma tabela de pesos customizada (parametrizável)", () => {
    const customWeights = {
      videoaula: 1,
      pdf: 1,
      questoes: 1,
      flashcards: 1,
      revisao: 1,
      simulado: 1,
      resumo: 1,
      mapa_mental: 1,
    };
    const blocks = allocateSessionMinutes(40, ["videoaula", "questoes"], customWeights);
    expect(blocks.map((block) => block.minutes)).toEqual([20, 20]);
  });
});
