/**
 * Embaralhamento DETERMINÍSTICO das alternativas de uma questão dentro de uma tentativa
 * (CLAUDE.md §18: "as alternativas podem ser embaralhadas, preservando rastreabilidade").
 *
 * Determinístico por `seed` (tipicamente `${attemptId}:${questionId}`) — a mesma tentativa
 * sempre vê a MESMA ordem de alternativas em chamadas repetidas (ex.: `getAttemptForTaking`
 * chamado de novo ao recarregar a página), mas ordens diferentes entre tentativas/usuários
 * diferentes. "Rastreabilidade" é preservada porque cada alternativa mantém seu `id` real —
 * só a POSIÇÃO de exibição muda, nunca a identidade.
 */

/** Hash simples (djb2) de uma string em um inteiro de 32 bits, usado como semente do PRNG. */
function hashSeed(seed: string): number {
  let hash = 5381;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 33) ^ seed.charCodeAt(i);
  }
  return hash >>> 0;
}

/** PRNG determinístico (mulberry32) — suficiente para embaralhar, sem pretensão criptográfica. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates com um PRNG determinístico derivado de `seed`. Não muta `items`. */
export function deterministicShuffle<T>(items: readonly T[], seed: string): T[] {
  const result = [...items];
  const random = mulberry32(hashSeed(seed));
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/** Embaralhamento NÃO determinístico — usado só para escolher/ordenar candidatos de um pool
 *  de questões (a seleção em si não precisa ser reproduzível; só a ordem de opções dentro de
 *  uma tentativa já criada precisa, ver `deterministicShuffle`). */
export function randomShuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}
