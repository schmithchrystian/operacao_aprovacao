"use server";

import { fail, ok, type ActionResult } from "@/contracts/common";
import { getRankingInputSchema } from "@/contracts/ranking";
import { isDomainError, ValidationError } from "@/server/errors";
import { getRanking, type RankingReadResult } from "@/server/services/gamification";
import { parseInput } from "@/server/validation";

/**
 * Server Action fina (docs/ARCHITECTURE.md §6, mesmo padrão de `@/server/actions/gamification`):
 * valida a entrada (Zod) e repassa ao serviço de leitura (Fase 9). Nunca aceita `userId` do
 * cliente — a posição do usuário atual vem sempre da sessão real, dentro de `getRanking`.
 */
export async function getRankingAction(rawInput: unknown): Promise<ActionResult<RankingReadResult>> {
  try {
    const input = parseInput(getRankingInputSchema, rawInput);
    const result = await getRanking({
      periodType: input.periodType,
      scopeType: input.scopeType,
      scopeKeyRaw: input.scopeKey,
      page: input.page,
    });
    return ok(result);
  } catch (error) {
    if (isDomainError(error)) {
      const fieldErrors = error instanceof ValidationError ? error.fieldErrors : undefined;
      return fail(error.code, error.message, fieldErrors);
    }
    return fail("INTERNAL_ERROR", "Não foi possível carregar o ranking.");
  }
}
