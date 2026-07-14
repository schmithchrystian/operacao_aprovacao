import {
  STUDY_SESSION,
  STUDY_SESSION_BLOCK_LABELS,
  STUDY_SESSION_BLOCK_ORDER,
  STUDY_SESSION_BLOCK_WEIGHTS,
  type StudySessionContentType,
} from "@/config/business";
import { distributeProportionally } from "./allocation";

/**
 * Núcleo PURO (sem I/O) da alocação de "Montar estudo" (Fase 11 — agente `study-tracking`).
 * Dado o tempo disponível + os tipos de conteúdo escolhidos, devolve quantos minutos cada tipo
 * recebe — proporcional aos pesos default (`STUDY_SESSION_BLOCK_WEIGHTS`, configurável em
 * `@/config/business.ts`), sempre somando EXATAMENTE `availableMinutes` (mesmo com
 * arredondamento — `distributeProportionally`), em ordem pedagógica coerente
 * (`STUDY_SESSION_BLOCK_ORDER`: aprender → praticar → reforçar), independente da ordem em que
 * o aluno selecionou os tipos.
 *
 * Cenário de referência (`tests/unit/study-session-generator.test.ts`): 60 minutos +
 * `["videoaula","questoes","flashcards","revisao"]` (pesos 5/3/2/2) → 25/15/10/10 minutos.
 */
export interface SessionBlockAllocation {
  type: StudySessionContentType;
  label: string;
  minutes: number;
}

export function allocateSessionMinutes(
  availableMinutes: number,
  contentTypes: readonly StudySessionContentType[],
  weightTable: Readonly<Record<StudySessionContentType, number>> = STUDY_SESSION_BLOCK_WEIGHTS,
): SessionBlockAllocation[] {
  const uniqueTypes = new Set(contentTypes);
  const orderedTypes = STUDY_SESSION_BLOCK_ORDER.filter((type) => uniqueTypes.has(type));

  if (orderedTypes.length === 0) {
    return [];
  }

  const weights = orderedTypes.map((type) => weightTable[type]);
  const rawMinutes = distributeProportionally(availableMinutes, weights);
  const finalMinutes = applyMinimumBlockMinutes(rawMinutes, STUDY_SESSION.minBlockMinutes);

  return orderedTypes.map((type, index) => ({
    type,
    label: STUDY_SESSION_BLOCK_LABELS[type],
    minutes: finalMinutes[index]!,
  }));
}

/**
 * Redistribui minutos dos blocos maiores para garantir que nenhum bloco fique abaixo de
 * `minBlockMinutes` — mas SÓ quando o tempo total disponível comporta pelo menos
 * `minBlockMinutes` para CADA posição (`sum(minutes) >= minBlockMinutes * length`); caso
 * contrário devolve a alocação proporcional pura (pode ter blocos menores que o mínimo, nunca
 * negativos) — não há como garantir um mínimo "de verdade" quando o orçamento total não
 * comporta (ex.: 3 minutos disponíveis para 5 tipos escolhidos).
 *
 * Preserva a soma total em toda iteração (só MOVE minutos entre posições, nunca cria/descarta).
 */
function applyMinimumBlockMinutes(minutes: readonly number[], minBlockMinutes: number): number[] {
  if (minutes.length === 0) {
    return [];
  }

  const total = minutes.reduce((sum, value) => sum + value, 0);
  if (total < minBlockMinutes * minutes.length) {
    return [...minutes];
  }

  const result = [...minutes];
  let deficit = result.reduce((sum, value) => sum + Math.max(0, minBlockMinutes - value), 0);

  while (deficit > 0) {
    const neederIndex = result.findIndex((value) => value < minBlockMinutes);
    if (neederIndex < 0) break;

    let donorIndex = -1;
    let donorValue = -Infinity;
    for (let index = 0; index < result.length; index += 1) {
      if (index === neederIndex) continue;
      const value = result[index]!;
      if (value > minBlockMinutes && value > donorValue) {
        donorValue = value;
        donorIndex = index;
      }
    }
    // Não deveria ocorrer dado o guard de `total >= minBlockMinutes * length` acima, mas evita
    // loop infinito caso a invariante seja violada por uma chamada futura.
    if (donorIndex < 0) break;

    result[donorIndex] = result[donorIndex]! - 1;
    result[neederIndex] = result[neederIndex]! + 1;
    deficit -= 1;
  }

  return result;
}
