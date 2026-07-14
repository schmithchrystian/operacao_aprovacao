import type { ProfileEntity } from "@/server/repositories/contracts/profile-repository";

/**
 * Mocks centralizados e tipados (ADR-0011, CLAUDE.md §23) — Fase 16 (agente `backend`).
 * Um `Profile` por usuário mock REAL (`mockUsers`, `src/mocks/data/users.ts`) — `user-1..4`.
 *
 * Variedade deliberada de configurações de privacidade (cobre os testes de mascaramento em
 * `tests/unit/profile-service.test.ts` e a integração com o ranking em
 * `tests/unit/ranking-read.test.ts`):
 * - `user-1` (Ana Recruta, aluno): perfil público "de exemplo" — mesma identidade/privacidade
 *   já usada em `REAL_PARTICIPANTS` (`ranking-participants.ts`): nome real, cidade/estado
 *   visíveis, aparece no ranking. Mantido em sincronia de propósito (ver TODO histórico ali)
 *   para o comportamento do ranking não mudar ao trocar a fonte de privacidade para `Profile`.
 * - `user-2` (Bruno Professor, professor): perfil ABERTO mas fora do ranking
 *   (`showInRanking: false`) — cobre "público, mas com opt-out específico do ranking" (a
 *   posição some da visão pública, mas o próprio dono sempre a vê via `getOwnProfile`).
 * - `user-3` (Carla Moderadora, moderador): perfil ABERTO mas com nome/desempenho mascarados
 *   (`showRealName: false`, `showPerformance: false`) — cidade/estado e horas continuam
 *   visíveis. Cobre o caso "público, mas parcialmente mascarado". Também usado pela integração
 *   com o ranking (não existe em `mockRankingParticipants` — a inclusão nas listagens só
 *   acontece por causa do `Profile`, prova direta do fechamento da pendência da Fase 9).
 * - `user-4` (Diego Admin, admin): perfil fechado por completo (`isProfilePublic: false`) E fora
 *   do ranking (`showInRanking: false`) — cobre "fechado" (nenhum agregado exposto a terceiros).
 *
 * `targetContestId` de cada um coincide com o concurso do curso em que já está matriculado
 * (`mockEnrollments`, `enrollments.ts`) — perfil coerente com o restante dos mocks.
 */
export const mockProfiles: ProfileEntity[] = [
  {
    id: "profile-user-1",
    userId: "user-1",
    bio: "Focada na aprovação para Soldado da Polícia Militar.",
    avatarUrl: null,
    phone: null,
    birthDate: null,
    city: "São Paulo",
    state: "SP",
    targetContestId: "contest-pm-soldado",
    isProfilePublic: true,
    showInRanking: true,
    showRealName: true,
    showCityState: true,
    showStudyHours: true,
    showPerformance: true,
    createdAt: "2026-01-05T08:00:00.000Z",
    updatedAt: "2026-01-05T08:00:00.000Z",
  },
  {
    id: "profile-user-2",
    userId: "user-2",
    bio: null,
    avatarUrl: null,
    phone: null,
    birthDate: null,
    city: null,
    state: null,
    targetContestId: "contest-gcm-agente",
    isProfilePublic: true,
    showInRanking: false,
    showRealName: true,
    showCityState: true,
    showStudyHours: true,
    showPerformance: true,
    createdAt: "2026-04-15T09:00:00.000Z",
    updatedAt: "2026-04-15T09:00:00.000Z",
  },
  {
    id: "profile-user-3",
    userId: "user-3",
    bio: "Estudando para a Guarda Civil e afins.",
    avatarUrl: null,
    phone: null,
    birthDate: null,
    city: "Rio de Janeiro",
    state: "RJ",
    targetContestId: "contest-pm-soldado",
    isProfilePublic: true,
    showInRanking: true,
    showRealName: false,
    showCityState: true,
    showStudyHours: true,
    showPerformance: false,
    createdAt: "2026-06-10T08:00:00.000Z",
    updatedAt: "2026-06-10T08:00:00.000Z",
  },
  {
    id: "profile-user-4",
    userId: "user-4",
    bio: null,
    avatarUrl: null,
    phone: null,
    birthDate: null,
    city: null,
    state: null,
    targetContestId: "contest-pp-agente",
    isProfilePublic: false,
    showInRanking: false,
    showRealName: true,
    showCityState: false,
    showStudyHours: false,
    showPerformance: false,
    createdAt: "2026-01-20T10:00:00.000Z",
    updatedAt: "2026-01-20T10:00:00.000Z",
  },
];
