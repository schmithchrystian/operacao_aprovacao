"use server";
import { headers } from "next/headers";
import { ZodError } from "zod";
import { env } from "@/config/env";
import { fail, ok, type ActionResult } from "@/contracts/common";
import { isDomainError } from "@/server/errors";
import {
  createAccountService,
  trustedAccountIp,
  InvalidAccountTokenError,
} from "@/server/accounts/service";
import { AccountConfigurationError } from "@/server/accounts/email";

type Operation = "register" | "requestVerification" | "requestReset" | "verify" | "resetPassword";
async function execute(
  operation: Operation,
  input: unknown,
): Promise<ActionResult<{ message: string }>> {
  try {
    const ip = trustedAccountIp(new Headers(await headers()), env.TRUSTED_PROXY_IP_HEADER);
    return ok(await createAccountService()[operation](input, ip));
  } catch (error) {
    if (error instanceof ZodError)
      return fail("VALIDATION_ERROR", error.issues[0]?.message ?? "Confira os dados informados.");
    if (error instanceof AccountConfigurationError)
      return fail("SERVICE_UNAVAILABLE", error.message);
    if (isDomainError(error)) return fail(error.code, error.message);
    if (error instanceof InvalidAccountTokenError)
      return fail("INVALID_TOKEN", "Link inválido ou expirado. Solicite um novo link.");
    return fail(
      "INTERNAL_ERROR",
      "Não foi possível concluir a solicitação. Tente novamente mais tarde.",
    );
  }
}
export async function registerAccountAction(input: unknown) {
  return execute("register", input);
}
export async function requestVerificationAction(input: unknown) {
  return execute("requestVerification", input);
}
export async function requestPasswordResetAction(input: unknown) {
  return execute("requestReset", input);
}
export async function verifyEmailAction(input: unknown) {
  return execute("verify", input);
}
export async function resetPasswordAction(input: unknown) {
  return execute("resetPassword", input);
}
