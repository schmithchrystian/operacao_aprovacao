import { STUDY_PLAN } from "@/config/business";
import { buildWeightedSequence, distributeProportionally } from "./allocation";
import { addDaysIso, diffDaysIso } from "./date-utils";

/**
 * Núcleo PURO (sem I/O, sem `Date.now()`) da heurística de "Plano de estudos" (Fase 11 —
 * agente `study-tracking`). `startDate`/`examDate` são sempre entrada explícita de quem chama
 * (`src/server/services/study-plan/generate-plan.ts` resolve "hoje" a partir de um `now`
 * injetado antes de chegar aqui) — determinístico, fácil de testar isoladamente.
 *
 * HEURÍSTICA (resumo — ver `tests/unit/study-plan-generator.test.ts` para os casos cobertos):
 * 1. O horizonte (`startDate` até `examDate`, exclusive) é dividido em ciclos de 7 dias
 *    ANCORADOS em `startDate`; os primeiros `daysPerWeek` dias de cada ciclo são "dias de
 *    estudo", o restante são "dias de folga".
 * 2. Cada dia de estudo recebe 1 bloco (dia inteiro) ou 2 blocos (metade do dia cada) de
 *    matérias distintas, dependendo de `hoursPerDay` (`STUDY_PLAN.minHoursForTwoSubjectsPerDay`)
 *    — a matéria de cada bloco vem de uma sequência PROPORCIONAL AO PESO (`buildWeightedSequence`,
 *    D'Hondt): a matéria de maior peso aparece mais vezes (mais dias/mais minutos totais).
 * 3. O ÚLTIMO dia de cada ciclo de 7 (`dayOffset % 7 === 6`) SEMPRE recebe um item de simulado
 *    semanal quando `includeMockExams` — ADITIVO ao orçamento do dia (simulados reais costumam
 *    ser feitos à parte do tempo diário normal de estudo), estudo ou folga.
 * 4. Os DEMAIS dias de folga (quando `includeReviews`) recebem um item de revisão — mesma
 *    sequência ponderada, contador próprio (não compete pelo mesmo slot dos dias de estudo).
 * 5. Itens são devolvidos ordenados cronologicamente (por `date`, depois por ordem de geração).
 */

export interface PlanGeneratorSubjectInput {
  subjectId: string;
  /** Peso relativo (não precisa somar 1 entre as matérias). */
  weight: number;
}

export interface PlanGeneratorInput {
  /** ISO 8601 (meia-noite UTC). */
  startDate: string;
  /** ISO 8601 (meia-noite UTC) — deve ser posterior a `startDate` (validado no contrato). */
  examDate: string;
  /** 1-7 — quantos dias de cada ciclo de 7 são dias de estudo. */
  daysPerWeek: number;
  /** Horas de estudo por dia (dias de estudo). */
  hoursPerDay: number;
  subjects: readonly PlanGeneratorSubjectInput[];
  includeReviews: boolean;
  includeMockExams: boolean;
}

export type PlanGeneratorItemKind = "STUDY" | "REVIEW" | "MOCK_EXAM";

export interface PlanGeneratorItem {
  /** ISO 8601 (meia-noite UTC). */
  date: string;
  kind: PlanGeneratorItemKind;
  /** `null` para itens sem matéria específica (ex.: simulado semanal geral). */
  subjectId: string | null;
  estimatedMinutes: number;
  /** Posição cronológica — reatribuída após a ordenação final (0-based). */
  order: number;
}

export function generateStudyPlanItems(input: PlanGeneratorInput): PlanGeneratorItem[] {
  const totalDays = diffDaysIso(input.startDate, input.examDate);
  if (totalDays <= 0 || input.subjects.length === 0) {
    return [];
  }

  const weights = input.subjects.map((subject) => subject.weight);
  const blocksPerDay = input.hoursPerDay >= STUDY_PLAN.minHoursForTwoSubjectsPerDay ? 2 : 1;
  const minutesPerDay = Math.max(0, Math.round(input.hoursPerDay * 60));
  const minutesPerBlock = distributeProportionally(minutesPerDay, new Array<number>(blocksPerDay).fill(1));

  const studyDayOffsets: number[] = [];
  const restDayOffsets: number[] = [];
  for (let dayOffset = 0; dayOffset < totalDays; dayOffset += 1) {
    const isStudyDay = dayOffset % 7 < input.daysPerWeek;
    (isStudyDay ? studyDayOffsets : restDayOffsets).push(dayOffset);
  }

  const studySequence = buildWeightedSequence(studyDayOffsets.length * blocksPerDay, weights);
  const reviewSequence = buildWeightedSequence(restDayOffsets.length, weights);

  const items: PlanGeneratorItem[] = [];
  let insertionOrder = 0;

  studyDayOffsets.forEach((dayOffset, dayIndex) => {
    const date = addDaysIso(input.startDate, dayOffset);

    for (let block = 0; block < blocksPerDay; block += 1) {
      const subjectIndex = studySequence[dayIndex * blocksPerDay + block]!;
      const subject = input.subjects[subjectIndex]!;
      items.push({
        date,
        kind: "STUDY",
        subjectId: subject.subjectId,
        estimatedMinutes: minutesPerBlock[block]!,
        order: insertionOrder++,
      });
    }

    if (input.includeMockExams && dayOffset % 7 === 6) {
      items.push({
        date,
        kind: "MOCK_EXAM",
        subjectId: null,
        estimatedMinutes: STUDY_PLAN.defaultWeeklyMockExamMinutes,
        order: insertionOrder++,
      });
    }
  });

  restDayOffsets.forEach((dayOffset, dayIndex) => {
    const date = addDaysIso(input.startDate, dayOffset);
    const isWeeklyMockExamDay = input.includeMockExams && dayOffset % 7 === 6;

    if (isWeeklyMockExamDay) {
      items.push({
        date,
        kind: "MOCK_EXAM",
        subjectId: null,
        estimatedMinutes: STUDY_PLAN.defaultWeeklyMockExamMinutes,
        order: insertionOrder++,
      });
      return;
    }

    if (input.includeReviews) {
      const subjectIndex = reviewSequence[dayIndex]!;
      const subject = input.subjects[subjectIndex]!;
      items.push({
        date,
        kind: "REVIEW",
        subjectId: subject.subjectId,
        estimatedMinutes: STUDY_PLAN.defaultReviewMinutes,
        order: insertionOrder++,
      });
    }
  });

  // Reordena cronologicamente (o loop acima gera "todos os dias de estudo" antes de "todos os
  // dias de folga") — `order` de inserção como desempate estável dentro do mesmo dia.
  items.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.order - b.order;
  });

  return items.map((item, index) => ({ ...item, order: index }));
}
