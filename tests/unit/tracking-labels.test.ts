import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { formatWeekLabel, formatMonthLabel } from "@/components/tracking/labels";
import { formatDatePtBr } from "@/lib/utils";

/**
 * Regressão dos formatadores de data (pt-BR) — MÉDIO da revisão da Fase 12: as datas do backend
 * são meia-noite UTC (convenção de `@/server/services/study-plan/date-utils`); formatar sem
 * `timeZone: "UTC"` usaria o fuso LOCAL e, num público UTC-3, exibiria o dia/mês anterior
 * (off-by-one). Este teste força o fuso do processo para `America/Sao_Paulo` (UTC-3) — cada
 * `expect` abaixo FALHARIA se o `timeZone: "UTC"` fosse removido dos formatadores.
 *
 * V8 relê `process.env.TZ` em cada `Intl.DateTimeFormat` (verificado), então mudar o TZ em
 * runtime basta — restaurado no `afterAll` para não vazar para outros arquivos de teste que
 * compartilhem o mesmo worker.
 */
describe("tracking/labels + lib/utils — formatadores fixam timeZone UTC (público UTC-3)", () => {
  const originalTz = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = "America/Sao_Paulo"; // UTC-3
  });

  afterAll(() => {
    // Restaura o valor original exato (pode ser `undefined` — não deixar "America/Sao_Paulo" vazar).
    if (originalTz === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTz;
    }
  });

  it("formatWeekLabel mantém o dia civil UTC (segunda 13/07, não 12/07 do fuso local)", () => {
    // Meia-noite UTC de 2026-07-13 é 21:00 de 2026-07-12 em São Paulo — sem timeZone UTC daria "12/07".
    expect(formatWeekLabel("2026-07-13T00:00:00.000Z")).toBe("13/07");
  });

  it("formatMonthLabel mantém o mês civil UTC (julho, não junho do fuso local)", () => {
    // "2026-07" -> dia 1 à meia-noite UTC = 30/06 21:00 em São Paulo — sem timeZone UTC daria "jun".
    const label = formatMonthLabel("2026-07");
    expect(label).toMatch(/jul/i);
    expect(label).not.toMatch(/jun/i);
    expect(label).toMatch(/26/);
  });

  it("formatDatePtBr mantém dia e mês civis UTC (01 de julho, não 30 de junho)", () => {
    const label = formatDatePtBr("2026-07-01T00:00:00.000Z");
    expect(label).toContain("01");
    expect(label).toMatch(/jul/i);
    expect(label).not.toMatch(/jun/i);
    expect(label).toContain("2026");
  });
});
