import { mockStore } from "@/server/repositories/mock/mock-store";

/**
 * Serialização em memória por `userId` para as seções críticas de `startFocusSession` E
 * `finishFocusSession` (Fase 15) — cópia independente do MESMO padrão de
 * `@/server/services/flashcards/review-lock.ts` (mesma convenção do projeto de duplicar pequenos
 * utilitários de concorrência por domínio, em vez de compartilhar um módulo central).
 *
 * POR QUE ISTO É NECESSÁRIO:
 * - `start`: o fluxo "ler a sessão ACTIVE atual do usuário → descartá-la → criar a nova" não é
 *   atômico (há `await` entre os passos). Sem serialização, dois cliques rápidos em "iniciar" do
 *   MESMO usuário poderiam ambos ler "nenhuma sessão ativa" antes de qualquer `create`, e os DOIS
 *   criarem uma sessão `ACTIVE` — violando "no máximo uma sessão de foco ativa por usuário"
 *   (CLAUDE.md §14, "sessões simultâneas suspeitas") e abrindo brecha para pontuar duas vezes.
 * - `finish`: "ler sessão → checar ACTIVE → validar → salvar FINISHED → emitir `PomodoroCompleted`"
 *   também não é atômico. Duas finalizações concorrentes da mesma sessão poderiam ambas ler
 *   `ACTIVE` e ambas emitir o evento de 50 pontos — a dupla-pontuação só seria barrada pela janela
 *   de idempotência do EventBus/motor, que tem corrida no mock. Serializado pela MESMA chave
 *   (`userId`), a 2ª só roda depois que a 1ª salvou `FINISHED` → cai em `ConflictError`, sem
 *   repontuar. `start` e `finish` compartilharem a chave é seguro (nenhum chama o outro sob o
 *   lock — sem reentrância) e coerente (um usuário só tem uma sessão ativa por vez).
 *
 * Estado via `mockStore` (`@/server/repositories/mock/mock-store`): no Next.js 16 (Turbopack
 * dev/serverless), Route Handlers/Server Actions podem cair em instâncias de módulo SEPARADAS
 * — um `const tails = new Map()` de topo de módulo criaria uma fila POR INSTÂNCIA e não
 * serializaria nada entre chamadas concorrentes que caíssem em instâncias diferentes (o mesmo
 * bug que quebrava `POST /api/focus/heartbeat` após `startFocusSessionAction`).
 */
const tails = mockStore<Map<string, Promise<void>>>("focus-lock", () => new Map());

/**
 * Executa `fn` em exclusão mútua por `key`: chamadas concorrentes com a MESMA chave rodam em
 * série (a próxima só começa quando a anterior termina — sucesso OU erro). Chaves diferentes não
 * se bloqueiam. Propaga o resultado/erro de `fn` normalmente para quem chamou.
 */
export async function withFocusLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = tails.get(key) ?? Promise.resolve();

  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
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
    if (tails.get(key) === tail) {
      tails.delete(key);
    }
  }
}

/** Uso exclusivo de testes — limpa todo o estado de locks em memória. */
export function __resetFocusLockStore(): void {
  tails.clear();
}
