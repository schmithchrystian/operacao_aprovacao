import { mockStore } from "@/server/repositories/mock/mock-store";

/**
 * Serialização em memória por chave `(userId, flashcardId)` para a seção crítica de `reviewCard`
 * (Fase 14 — correção do achado de segurança ALTO A1). Em memória, por processo — MESMA
 * limitação/estilo dos rate-limits deste projeto (`@/server/services/simulations/rate-limit`,
 * `@/server/services/study-tracking/rate-limit`): adequado ao MVP single-instance.
 *
 * POR QUE ISTO É NECESSÁRIO: o fluxo "ler última revisão → checar gate 'devido' → criar revisão
 * → emitir FlashcardCorrect" NÃO é atômico — `await auth()` (em `requireUser`) e os awaits de
 * repositório cedem o event loop. Sem serialização, K requisições concorrentes de `reviewCard`
 * no MESMO cartão devido leem o estado "devido/sem revisão pendente" ANTES de qualquer `create`,
 * TODAS passam o gate e cada uma credita 5 pontos (farm por corrida). A `idempotencyKey` é por
 * `reviewId` recém-criado (chaves diferentes por revisão), então nenhuma camada de idempotência
 * do motor de gamificação deduplica. Este mutex garante que, das K concorrentes, só a 1ª executa
 * a seção crítica inteira; as demais só prosseguem DEPOIS de a 1ª criar a revisão e então caem no
 * gate "não devido" → `ConflictError` (nenhuma pontua).
 *
 * TODO(fase de banco): a solução DEFINITIVA é uma inserção condicional/transação com row-lock —
 * "inserir a revisão só se NÃO existir revisão de (userId, cardId) com nextReviewAt > now", numa
 * única transação (ex.: `INSERT ... SELECT ... WHERE NOT EXISTS (...)` ou `SELECT ... FOR UPDATE`
 * sobre a última revisão do par). Uma constraint `@unique` SÓ na `idempotencyKey` NÃO resolve,
 * porque as chaves diferem por `reviewId`. Este mutex em memória some quando houver múltiplas
 * instâncias — só a barreira no banco fecha a corrida entre processos distintos.
 *
 * Estado via `mockStore` (`@/server/repositories/mock/mock-store`): no Next.js 16 (Turbopack
 * dev/serverless), Route Handlers/Server Actions podem cair em instâncias de módulo SEPARADAS
 * — um `const tails = new Map()` de topo de módulo criaria uma fila POR INSTÂNCIA e não
 * serializaria nada entre chamadas concorrentes que caíssem em instâncias diferentes.
 * `mockStore` garante o MESMO `Map` para todas as instâncias dentro do processo.
 */

/** Cauda da fila de execução por chave — cada nova chamada encadeia após a anterior. */
const tails = mockStore<Map<string, Promise<void>>>("flashcard-review-lock", () => new Map());

export function reviewLockKey(userId: string, flashcardId: string): string {
  return `${userId}:${flashcardId}`;
}

/**
 * Executa `fn` em exclusão mútua por `key`: chamadas concorrentes com a MESMA chave rodam em
 * série (a próxima só começa quando a anterior termina — sucesso OU erro). Chaves diferentes não
 * se bloqueiam. Propaga o resultado/erro de `fn` normalmente para quem chamou.
 *
 * A inscrição na fila (`tails.set`) acontece de forma SÍNCRONA na entrada, antes de qualquer
 * `await` — como o event loop é single-thread, isso torna o "pega a vez" atômico entre chamadas
 * concorrentes (não há janela em que duas leiam a mesma cauda e a sobrescrevam).
 */
export async function withReviewLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = tails.get(key) ?? Promise.resolve();

  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  // A próxima chamada espera nossa `gate` (que só resolve no `finally` abaixo). Ignoramos erros
  // da anterior (`previous` já foi tratada por quem a disparou) para não rejeitar a fila inteira.
  const tail = previous.then(
    () => gate,
    () => gate,
  );
  tails.set(key, tail);

  await previous.catch(() => undefined); // espera a vez sem herdar rejeição da anterior.
  try {
    return await fn();
  } finally {
    release();
    // Limpa a chave se ainda somos a última da fila (evita crescimento ilimitado do Map).
    if (tails.get(key) === tail) {
      tails.delete(key);
    }
  }
}

/** Uso exclusivo de testes — limpa todo o estado de locks em memória. */
export function __resetReviewLockStore(): void {
  tails.clear();
}
