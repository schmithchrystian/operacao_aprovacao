// Leitura (Fase 16 — agente `backend`, CLAUDE.md §31 item 19).
export { getOwnProfile, getPublicProfile } from "./read";

// Escrita — dados de perfil e preferências de privacidade (auditadas em separado).
export { updateProfile, updatePrivacy } from "./update";

// Blocos de composição reaproveitáveis (agregados, resolução de concurso/prova, get-or-create).
export {
  buildAggregates,
  getOrCreateProfile,
  maskAggregatesForVisitor,
  resolveExamDate,
  resolveInterestedContests,
  resolveMainContest,
} from "./shared";
