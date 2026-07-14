import type { ProfileDTO, UpdatePrivacySettingsInput, UpdateProfileInput } from "@/contracts/profile";
import { auditLog } from "@/server/audit";
import { assertOwnership, requireUser } from "@/server/authorization";
import { ValidationError } from "@/server/errors";
import { getRepositories } from "@/server/repositories";
import { getOrCreateProfile } from "./shared";
import { getOwnProfile } from "./read";

/**
 * Escrita do perfil (Fase 16 — agente `backend`). Duas operações separadas — dados de perfil
 * (`updateProfile`) e preferências de privacidade (`updatePrivacy`) — cada uma com sua própria
 * entrada validada (Zod, `@/contracts/profile`) e seu próprio registro de auditoria (nunca o
 * MESMO evento para as duas, para o histórico distinguir "editou perfil" de "mudou
 * privacidade"). Autorização (ADR-0006) idêntica nas duas: `requireUser` + `assertOwnership` —
 * nunca é possível editar o perfil/privacidade de outro usuário (anti-IDOR).
 *
 * `auditLog.metadata` guarda só os NOMES dos campos alterados, nunca os valores (CLAUDE.md §9:
 * não registrar dados pessoais desnecessários) — `bio`/`phone`/`birthDate`/`city`/`state` são
 * exatamente o tipo de dado pessoal que não deve parar em log.
 */

/** Garante que, quando informado, `targetContestId` corresponde a um concurso real (existe
 *  pelo menos um curso no catálogo com esse `contestId`) — evita um perfil apontando para um
 *  concurso inexistente (mesmo espírito da validação de `subjectId`/`topicId` em
 *  `createCard`, `@/server/services/brainstorm`). */
async function assertContestExists(targetContestId: string): Promise<void> {
  const repos = getRepositories();
  const courses = await repos.courses.listByContestId(targetContestId);
  if (courses.length === 0) {
    throw new ValidationError("Concurso informado não existe.", {
      targetContestId: ["Concurso inválido."],
    });
  }
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
  now: Date = new Date(),
): Promise<ProfileDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  if (input.targetContestId !== undefined && input.targetContestId !== null) {
    await assertContestExists(input.targetContestId);
  }

  await getOrCreateProfile(userId, now);

  const repos = getRepositories();
  const updated = await repos.profiles.update({
    userId,
    bio: input.bio,
    avatarUrl: input.avatarUrl,
    phone: input.phone,
    birthDate: input.birthDate,
    city: input.city,
    state: input.state,
    targetContestId: input.targetContestId,
    now,
  });

  auditLog({
    operation: "profile.update",
    userId,
    entity: "Profile",
    entityId: updated.id,
    result: "success",
    correlationId: updated.id,
    metadata: { fields: Object.keys(input) },
  });

  return getOwnProfile(userId);
}

export async function updatePrivacy(
  userId: string,
  input: UpdatePrivacySettingsInput,
  now: Date = new Date(),
): Promise<ProfileDTO> {
  const session = await requireUser();
  assertOwnership(userId, session.userId);

  await getOrCreateProfile(userId, now);

  const repos = getRepositories();
  const updated = await repos.profiles.updatePrivacy({
    userId,
    isProfilePublic: input.isProfilePublic,
    showInRanking: input.showInRanking,
    showRealName: input.showRealName,
    showCityState: input.showCityState,
    showStudyHours: input.showStudyHours,
    showPerformance: input.showPerformance,
    now,
  });

  auditLog({
    operation: "profile.update-privacy",
    userId,
    entity: "Profile",
    entityId: updated.id,
    result: "success",
    correlationId: updated.id,
    metadata: { fields: Object.keys(input) },
  });

  return getOwnProfile(userId);
}
