import { describe, expect, it } from "vitest";
import { buildWeightedSequence, distributeProportionally } from "@/server/services/study-plan/allocation";

/**
 * Testes dos utilitários PUROS de alocação proporcional (Fase 11 — CLAUDE.md §31 item 13),
 * compartilhados pelo gerador de sessão (minutos) e pelo gerador de plano (dias/matéria).
 */
describe("allocation/distributeProportionally", () => {
  it("distribui exatamente sem resto quando a divisão é exata (cenário de referência 60min)", () => {
    // videoaula/questoes/flashcards/revisao — pesos 5/3/2/2 — 60 minutos.
    expect(distributeProportionally(60, [5, 3, 2, 2])).toEqual([25, 15, 10, 10]);
  });

  it("a soma do resultado é sempre exatamente `total`, mesmo com arredondamento", () => {
    const result = distributeProportionally(50, [1, 1, 1]);
    expect(result.reduce((sum, value) => sum + value, 0)).toBe(50);
    expect(result).toEqual([17, 17, 16]); // maiores restos: empate resolvido pelo índice menor
  });

  it("empates de fração são resolvidos de forma determinística pelo índice original", () => {
    const first = distributeProportionally(50, [1, 1, 1]);
    const second = distributeProportionally(50, [1, 1, 1]);
    expect(first).toEqual(second);
  });

  it("um único peso recebe o total inteiro", () => {
    expect(distributeProportionally(45, [7])).toEqual([45]);
  });

  it("lista de pesos vazia devolve lista vazia", () => {
    expect(distributeProportionally(60, [])).toEqual([]);
  });

  it("total zero ou negativo devolve zeros (sem lançar)", () => {
    expect(distributeProportionally(0, [5, 3])).toEqual([0, 0]);
    expect(distributeProportionally(-10, [5, 3])).toEqual([0, 0]);
  });

  it("todos os pesos zero/negativos distribui uniformemente em vez de descartar o total", () => {
    const result = distributeProportionally(9, [0, 0, 0]);
    expect(result.reduce((sum, value) => sum + value, 0)).toBe(9);
    expect(result).toEqual([3, 3, 3]);
  });

  it("pesos muito desproporcionais ainda somam o total exato", () => {
    const result = distributeProportionally(100, [97, 1, 1, 1]);
    expect(result.reduce((sum, value) => sum + value, 0)).toBe(100);
    expect(result[0]).toBeGreaterThan(result[1]!);
  });
});

describe("allocation/buildWeightedSequence", () => {
  it("produz contagens finais proporcionais aos pesos (3/2/1 para pesos [3,2,1] e length=6)", () => {
    const sequence = buildWeightedSequence(6, [3, 2, 1]);
    const counts = [0, 1, 2].map((index) => sequence.filter((value) => value === index).length);
    expect(counts).toEqual([3, 2, 1]);
  });

  it("é bem intercalada — nunca todas as ocorrências do maior peso seguidas no início", () => {
    const sequence = buildWeightedSequence(6, [3, 2, 1]);
    // Se fosse "tudo do peso maior primeiro", os 3 primeiros elementos seriam todos índice 0.
    expect(sequence.slice(0, 3)).not.toEqual([0, 0, 0]);
  });

  it("é determinística — mesma entrada sempre produz a mesma sequência", () => {
    expect(buildWeightedSequence(10, [4, 3, 2, 1])).toEqual(buildWeightedSequence(10, [4, 3, 2, 1]));
  });

  it("pesos iguais alternam em round-robin simples", () => {
    expect(buildWeightedSequence(4, [1, 1])).toEqual([0, 1, 0, 1]);
  });

  it("length zero ou pesos vazios devolvem lista vazia", () => {
    expect(buildWeightedSequence(0, [1, 2])).toEqual([]);
    expect(buildWeightedSequence(5, [])).toEqual([]);
  });
});
