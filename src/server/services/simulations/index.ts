/**
 * Barril do domínio de simulados (Fase 10 — agente `simulations`, CLAUDE.md §18/§25).
 * Ver `docs/ARCHITECTURE.md` §5/§8 para o desenho geral de camadas.
 */
export { createAttempt } from "./create-attempt";
export { getAttemptForTaking, getResult } from "./get-attempt";
export { submitAndFinalize } from "./submit-and-finalize";
export { getHistory } from "./history";
export { getErrorNotebook } from "./error-notebook";
export { getAttemptStatus } from "./get-attempt";
export { toggleFavorite, listFavorites } from "./favorites";
export { resolveMockExamForConfig } from "./question-pool";
export { listMockExamCatalog, listSubjectOptions, listTopicOptions } from "./catalog";
export {
  assertSimulationsRateLimit,
  checkSimulationsRateLimit,
  simulationsRateLimitKey,
  __resetSimulationsRateLimitStore,
} from "./rate-limit";
/** Reaproveitado pela Fase 12 (`@/server/services/study-tracking/tracking-overview`) para
 *  agregar aproveitamento por matéria/assunto sobre TODO o histórico de `QuestionAttempt`. */
export { computePerformance } from "./mappers";
