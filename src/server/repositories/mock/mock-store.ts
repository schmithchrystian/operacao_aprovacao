/**
 * Estado compartilhado dos repositórios/locks/rate-limiters MOCK deste projeto (ADR-0011).
 *
 * O PROBLEMA (confirmado em produção/dev — Modo Foco, Fase 15): no Next.js 16 (Turbopack em
 * dev e runtime serverless em produção), Route Handlers, Server Actions e Server Components
 * podem ser compilados/carregados como instâncias de MÓDULO SEPARADAS dentro do mesmo
 * processo. Um `let store = [...]` (ou um campo `static` de classe) no topo de um módulo mock
 * cria uma cópia POR INSTÂNCIA de módulo — o que uma fronteira grava não é visto por outra,
 * mesmo estando no mesmo processo Node. Foi assim que `POST /api/focus/heartbeat` (Route
 * Handler) passou a devolver 404: `startFocusSessionAction` (Server Action) criava a sessão
 * numa instância do módulo do repositório; o heartbeat rodava outra instância e não a
 * enxergava. O mesmo isolamento atinge qualquer outro mock mutável (heartbeat de vídeo da
 * Fase 7, recálculo de ranking via cron da Fase 9, etc.) — não é specific de um endpoint.
 *
 * A CORREÇÃO: o mesmo padrão do singleton do Prisma Client em dev (evitar recriar o client a
 * cada hot-reload, guardando-o em `globalThis`) — `globalThis` É compartilhado entre todas as
 * instâncias/reavaliações de módulo dentro do MESMO processo Node, ao contrário de `let`/
 * `const` de topo de módulo ou de campos `static` de classe. `mockStore(key, init)` devolve
 * sempre o MESMO objeto para a mesma `key`, não importa de qual instância de módulo é chamado.
 *
 * Em produção real (`DATA_SOURCE=prisma`, ver `@/config/env`), nada disto é usado — o estado
 * vive no Postgres via Prisma, que já é compartilhado corretamente entre instâncias/processos
 * (é um banco de dados real). Este helper é EXCLUSIVO das implementações mock (ADR-0002) e dos
 * locks/rate-limiters em memória que as acompanham.
 *
 * IMPORTANTE — estabilidade de identidade: cada chamador captura o valor devolvido UMA vez,
 * numa `const` de topo de módulo (ex.: `const store = mockStore("x", () => [...seed])`). A
 * partir daí o valor SÓ pode ser MUTADO, nunca REATRIBUÍDO:
 *   - array: `store.splice(0, store.length, ...novos)` em vez de `store = novos`;
 *   - Map: `store.clear()` / `store.set(...)` / `store.delete(...)` em vez de `store = new Map()`;
 *   - contador: guarde numa caixa `{ value: number }` e mute `.value` (números são primitivos —
 *     reatribuir a variável local não propaga para o `globalThis`).
 * Reatribuir a variável local trocaria só o ponteiro DESSA instância de módulo; a próxima
 * chamada a `mockStore` (de QUALQUER instância, inclusive a mesma) continuaria devolvendo o
 * objeto original do registro — reabrindo exatamente o bug que este helper existe para fechar.
 */

/**
 * Único ponto onde este arquivo precisa de um tipo "solto" (`unknown`, nunca `any`): o
 * registro guarda estados heterogêneos (arrays, Maps, contadores...) sob a mesma `Map`. A API
 * pública (`mockStore<T>`) é totalmente tipada para quem a chama — o `unknown` nunca escapa
 * daqui.
 */
interface MockStoreRegistryHost {
  __opAppMockStoreRegistry?: Map<string, unknown>;
}

function getRegistry(): Map<string, unknown> {
  const host = globalThis as MockStoreRegistryHost;
  host.__opAppMockStoreRegistry ??= new Map<string, unknown>();
  return host.__opAppMockStoreRegistry;
}

/**
 * Devolve o estado registrado sob `key`, inicializando com `init()` apenas na primeira
 * chamada (de qualquer instância de módulo, dentro do processo). Chamadas seguintes — mesmo
 * de OUTRA instância de módulo — devolvem o MESMO objeto. Nunca reatribua o valor devolvido;
 * mute-o (ver nota de estabilidade de identidade acima).
 */
export function mockStore<T>(key: string, init: () => T): T {
  const registry = getRegistry();
  if (!registry.has(key)) {
    registry.set(key, init());
  }
  return registry.get(key) as T;
}

/** Restore serializable mock data in place; synchronization queues are excluded. */
export function snapshotMockStores(): () => void {
  const snapshots = new Map<string, unknown>();
  for (const [key, value] of getRegistry()) {
    if (key.includes("lock") || key.includes("rate-limit")) continue;
    snapshots.set(key, structuredClone(value));
  }
  return () => {
    for (const [key, snapshot] of snapshots) {
      const current = getRegistry().get(key);
      if (Array.isArray(current) && Array.isArray(snapshot)) {
        current.splice(0, current.length, ...snapshot);
      } else if (current instanceof Map && snapshot instanceof Map) {
        current.clear();
        for (const [k, v] of snapshot) current.set(k, v);
      } else if (current instanceof Set && snapshot instanceof Set) {
        current.clear();
        for (const v of snapshot) current.add(v);
      } else if (typeof current === "object" && current !== null && typeof snapshot === "object" && snapshot !== null) {
        for (const k of Object.keys(current)) Reflect.deleteProperty(current, k);
        Object.assign(current, snapshot);
      }
    }
  };
}
