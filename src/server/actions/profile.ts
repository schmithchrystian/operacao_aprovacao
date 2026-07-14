"use server";

import { fail, ok, type ActionResult } from "@/contracts/common";
import {
  getPublicProfileInputSchema,
  updatePrivacySettingsInputSchema,
  updateProfileInputSchema,
  type ProfileDTO,
} from "@/contracts/profile";
import { requireUser } from "@/server/authorization";
import { isDomainError, ValidationError } from "@/server/errors";
import { getOwnProfile, getPublicProfile, updatePrivacy, updateProfile } from "@/server/services/profile";
import { parseInput } from "@/server/validation";

/**
 * Server Actions finas (docs/ARCHITECTURE.md §6, mesmo padrão de `@/server/actions/study-plan`):
 * validam a entrada (Zod) e repassam ao service (Fase 16). `userId`/`viewerId` NUNCA vêm do
 * cliente — sempre resolvidos da sessão real do Auth.js (`requireUser`), nunca do corpo da
 * requisição (ADR-0006, anti-IDOR).
 */

function toActionError(error: unknown): ActionResult<never> {
  if (isDomainError(error)) {
    const fieldErrors = error instanceof ValidationError ? error.fieldErrors : undefined;
    return fail(error.code, error.message, fieldErrors);
  }
  return fail("INTERNAL_ERROR", "Não foi possível processar a solicitação.");
}

/** Lê o perfil COMPLETO do próprio usuário autenticado ("Meu perfil"). */
export async function getOwnProfileAction(): Promise<ActionResult<ProfileDTO>> {
  try {
    const session = await requireUser();
    const profile = await getOwnProfile(session.userId);
    return ok(profile);
  } catch (error) {
    return toActionError(error);
  }
}

/** Lê o perfil de outro usuário, respeitando a privacidade do alvo. Com `previewAsVisitor`, o
 *  dono vê a PRÓPRIA visão já mascarada (prévia "ver como outros veem" — achado M1). */
export async function getPublicProfileAction(rawInput: unknown): Promise<ActionResult<ProfileDTO>> {
  try {
    const input = parseInput(getPublicProfileInputSchema, rawInput);
    const session = await requireUser();
    const profile = await getPublicProfile(session.userId, input.targetUserId, {
      previewAsVisitor: input.previewAsVisitor,
    });
    return ok(profile);
  } catch (error) {
    return toActionError(error);
  }
}

/** Atualiza dados de perfil (bio/avatar/telefone/data de nascimento/cidade/estado/concurso). */
export async function updateProfileAction(rawInput: unknown): Promise<ActionResult<ProfileDTO>> {
  try {
    const input = parseInput(updateProfileInputSchema, rawInput);
    const session = await requireUser();
    const profile = await updateProfile(session.userId, input);
    return ok(profile);
  } catch (error) {
    return toActionError(error);
  }
}

/** Atualiza preferências de privacidade (nome/cidade-estado/horas/desempenho/ranking). */
export async function updatePrivacyAction(rawInput: unknown): Promise<ActionResult<ProfileDTO>> {
  try {
    const input = parseInput(updatePrivacySettingsInputSchema, rawInput);
    const session = await requireUser();
    const profile = await updatePrivacy(session.userId, input);
    return ok(profile);
  } catch (error) {
    return toActionError(error);
  }
}
