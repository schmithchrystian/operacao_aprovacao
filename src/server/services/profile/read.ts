import type { PrivacySettingsDTO, ProfileDTO } from "@/contracts/profile";
import { assertOwnership, requireUser } from "@/server/authorization";
import { NotFoundError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import type { ProfileEntity } from "@/server/repositories/contracts/profile-repository";
import { anonymizedRankingName } from "@/server/services/gamification";
import {
  buildAggregates,
  getOrCreateProfile,
  maskAggregatesForVisitor,
  resolveExamDate,
  resolveInterestedContests,
  resolveMainContest,
} from "./shared";

/**
 * Leitura do perfil (Fase 16 — agente `backend`, CLAUDE.md §11/§24/§31 item 19).
 *
 * REGRA DURA: privacidade aplicada SEMPRE no servidor — `getPublicProfile` nunca devolve um
 * campo que a UI teria que aprender a esconder sozinha; o que não pode ser visto já chega
 * `null`/vazio. A própria pessoa (`isOwnProfile === true`) sempre vê tudo, inclusive suas
 * próprias flags (`privacy`) — nunca mascarado para o dono.
 */

function toPrivacyDTO(profile: ProfileEntity): PrivacySettingsDTO {
  return {
    isProfilePublic: profile.isProfilePublic,
    showRealName: profile.showRealName,
    showCityState: profile.showCityState,
    showStudyHours: profile.showStudyHours,
    showPerformance: profile.showPerformance,
    showInRanking: profile.showInRanking,
  };
}

/** Monta o DTO COMPLETO (sem máscara) — usado tanto para o dono quanto como base para a versão
 *  mascarada de um visitante (`getPublicProfile` aplica a máscara por cima do resultado). */
async function buildFullProfileDTO(
  targetUserId: string,
  profile: ProfileEntity,
  isOwnProfile: boolean,
): Promise<ProfileDTO> {
  const repos = getRepositories();
  const user = await repos.users.findById(targetUserId);
  if (!user) {
    throw new NotFoundError("Usuário não encontrado.");
  }

  const [mainContest, interestedContests, examDate, aggregates] = await Promise.all([
    resolveMainContest(profile.targetContestId),
    resolveInterestedContests(targetUserId),
    resolveExamDate(targetUserId),
    buildAggregates(targetUserId),
  ]);

  return {
    userId: targetUserId,
    isOwnProfile,
    isPublic: profile.isProfilePublic,
    name: user.name,
    avatarUrl: profile.avatarUrl,
    bio: profile.bio,
    city: profile.city,
    state: profile.state,
    // HARDCODED — nunca gated por flag (ver docstring de `ProfileDTO`): os dois campos mais
    // sensíveis do Profile nunca aparecem para quem não é o dono, ponto fixo aqui em vez de
    // depender de cada chamador lembrar de mascarar por cima do resultado.
    phone: isOwnProfile ? profile.phone : null,
    birthDate: isOwnProfile ? profile.birthDate : null,
    mainContest,
    interestedContests,
    examDate,
    aggregates,
    privacy: isOwnProfile ? toPrivacyDTO(profile) : null,
  };
}

/** DTO "fechado" — devolvido para um visitante quando o alvo não tem `Profile` ainda OU tem
 *  `isProfilePublic === false` (fail-closed: ausência de Profile usa o default do schema,
 *  `isProfilePublic: false`, então também fecha). Nenhum dado pessoal/agregado vaza. */
function closedProfileDTO(targetUserId: string): ProfileDTO {
  return {
    userId: targetUserId,
    isOwnProfile: false,
    isPublic: false,
    name: null,
    avatarUrl: null,
    bio: null,
    city: null,
    state: null,
    phone: null,
    birthDate: null,
    mainContest: null,
    interestedContests: [],
    examDate: null,
    aggregates: null,
    privacy: null,
  };
}

/**
 * Perfil COMPLETO do próprio usuário autenticado (aba "Meu perfil"). Cria o `Profile` com os
 * defaults de privacidade na primeira visita (`getOrCreateProfile`) — só então lê os agregados.
 * Autorização (ADR-0006): `requireUser` + `assertOwnership`, nunca aceitando um `userId`
 * diferente do resolvido pela sessão real.
 */
export async function getOwnProfile(userId: string): Promise<ProfileDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  const profile = await getOrCreateProfile(userId, new Date());
  return buildFullProfileDTO(userId, profile, true);
}

export interface GetPublicProfileOptions {
  /** Prévia "ver como outros veem" (revisão de segurança Fase 16, achado M1): quando o dono
   *  consulta o PRÓPRIO perfil, aplica a máscara de visitante em vez do atalho de visão completa.
   *  No-op quando `targetUserId !== viewerId` (o visitante já é sempre mascarado). */
  previewAsVisitor?: boolean;
}

/**
 * Perfil de OUTRO usuário (ou do próprio, se `targetUserId === viewerId`), respeitando as
 * flags de privacidade do ALVO. `viewerId` é sempre o usuário autenticado (resolvido/validado
 * contra a sessão real, nunca contra um valor arbitrário do corpo da requisição) — permitir ver
 * o perfil de OUTRO é a exceção esperada aqui (diferente de `assertOwnership` nos demais
 * serviços, que sempre bloqueia acesso cruzado); o que protege dados de terceiros é a
 * PRIVACIDADE do alvo, não a igualdade de IDs.
 *
 * Regras aplicadas, nesta ordem:
 * 1. alvo não existe (`User`) => `NotFoundError`;
 * 2. `targetUserId === viewerId` E NÃO é prévia (`previewAsVisitor` falso) => visão COMPLETA
 *    (o dono vendo o próprio perfil normalmente);
 * 3. caso contrário (visitante real, OU o dono em modo prévia) => caminho de VISITANTE:
 *    3a. sem `Profile` OU `isProfilePublic === false` => DTO fechado (`closedProfileDTO`);
 *    3b. perfil público => visão MASCARADA por `showRealName`/`showCityState`/`showStudyHours`/
 *        `showPerformance`/`showInRanking` (nunca as flags cruas — `privacy: null`).
 *
 * SEGURANÇA (M1): `previewAsVisitor` só desliga o atalho da regra 2 (que exige `isSelf`); para
 * qualquer `targetUserId` que não seja o próprio, o fluxo é idêntico com ou sem o flag — logo o
 * dono nunca consegue usar a prévia para ver dado de OUTRO usuário mascarado-a-menos.
 */
export async function getPublicProfile(
  viewerId: string,
  targetUserId: string,
  options: GetPublicProfileOptions = {},
): Promise<ProfileDTO> {
  const session = await requireUser();
  assertOwnership(viewerId, session.userId);

  const repos = getRepositories();
  const targetUser = await repos.users.findById(targetUserId);
  if (!targetUser) {
    throw new NotFoundError("Usuário não encontrado.");
  }

  const isSelf = targetUserId === session.userId;
  if (isSelf && options.previewAsVisitor !== true) {
    const profile = await getOrCreateProfile(targetUserId, new Date());
    return buildFullProfileDTO(targetUserId, profile, true);
  }

  const profile = await repos.profiles.findByUserId(targetUserId);
  if (!profile || !profile.isProfilePublic) {
    return closedProfileDTO(targetUserId);
  }

  const full = await buildFullProfileDTO(targetUserId, profile, false);

  return {
    ...full,
    name: profile.showRealName ? full.name : anonymizedRankingName(targetUserId),
    city: profile.showCityState ? full.city : null,
    state: profile.showCityState ? full.state : null,
    aggregates: full.aggregates ? maskAggregatesForVisitor(full.aggregates, profile) : null,
  };
}
