/**
 * Utilitários PUROS de alocação proporcional (Fase 11 — agente `study-tracking`). Compartilhados
 * entre o gerador de sessão (`session-generator.ts` — minutos por tipo de conteúdo) e o gerador
 * de plano (`plan-generator.ts` — dias de estudo/revisão por matéria). Determinísticos: mesma
 * entrada sempre produz a mesma saída; nenhuma das duas funções usa `Math.random()`.
 */

/**
 * Distribui `total` (inteiro) entre `weights.length` posições, proporcionalmente aos pesos,
 * SEM perder nem sobrar unidade nenhuma — a soma do resultado é sempre exatamente `total`,
 * mesmo quando a divisão não é exata.
 *
 * Método dos MAIORES RESTOS (Hamilton/Hare): arredonda cada fração para baixo e distribui as
 * unidades restantes (sempre menos que `weights.length`) para as posições com maior parte
 * fracionária descartada; empates são resolvidos pelo índice original (menor índice primeiro)
 * — determinístico, nunca depende de ordenação instável ou de `Math.random()`.
 *
 * `weights` não precisa somar 1 (nem qualquer valor específico): só a PROPORÇÃO entre eles
 * importa. Pesos negativos são tratados como 0. Lista vazia devolve lista vazia; `total <= 0`
 * devolve zeros; quando nenhum peso é positivo, distribui o mais uniforme possível (pesos
 * iguais) em vez de descartar `total`.
 */
export function distributeProportionally(total: number, weights: readonly number[]): number[] {
  if (weights.length === 0) {
    return [];
  }
  if (total <= 0) {
    return weights.map(() => 0);
  }

  const safeWeights = weights.map((weight) => Math.max(0, weight));
  const totalWeight = safeWeights.reduce((sum, weight) => sum + weight, 0);

  if (totalWeight === 0) {
    return distributeProportionally(
      total,
      weights.map(() => 1),
    );
  }

  const raw = safeWeights.map((weight) => (total * weight) / totalWeight);
  const floors = raw.map((value) => Math.floor(value));
  const flooredSum = floors.reduce((sum, value) => sum + value, 0);
  const remainderUnits = total - flooredSum;

  const fractions = raw
    .map((value, index) => ({ index, fraction: value - floors[index]! }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  const result = [...floors];
  for (let i = 0; i < remainderUnits; i += 1) {
    const { index } = fractions[i]!;
    result[index] = result[index]! + 1;
  }

  return result;
}

/**
 * Gera uma sequência de `length` posições (índices em `weights`) proporcional aos pesos e bem
 * INTERCALADA — nunca "todas as ocorrências do peso maior primeiro, o resto depois". Usa o
 * método da maior média (D'Hondt/Jefferson, o mesmo da distribuição proporcional de cadeiras
 * parlamentares): a cada passo, escolhe o índice que maximiza `weight[i] / (contagem[i] + 1)`;
 * empates vão para o menor índice (determinístico).
 *
 * Ex.: pesos `[3,2,1]` e `length=6` produz as contagens finais 3/2/1 (proporcional aos pesos),
 * intercaladas ao longo da sequência — nunca as 3 ocorrências do peso 3 seguidas.
 */
export function buildWeightedSequence(length: number, weights: readonly number[]): number[] {
  if (weights.length === 0 || length <= 0) {
    return [];
  }

  const safeWeights = weights.map((weight) => Math.max(0, weight));
  const totalWeight = safeWeights.reduce((sum, weight) => sum + weight, 0);
  const effectiveWeights = totalWeight === 0 ? weights.map(() => 1) : safeWeights;

  const counts = effectiveWeights.map(() => 0);
  const sequence: number[] = [];

  for (let step = 0; step < length; step += 1) {
    let bestIndex = 0;
    let bestQuotient = -Infinity;
    for (let index = 0; index < effectiveWeights.length; index += 1) {
      const quotient = effectiveWeights[index]! / (counts[index]! + 1);
      if (quotient > bestQuotient) {
        bestQuotient = quotient;
        bestIndex = index;
      }
    }
    counts[bestIndex] = counts[bestIndex]! + 1;
    sequence.push(bestIndex);
  }

  return sequence;
}
