"use server";
import { z } from "zod";
import { beginMfa, confirmMfa } from "@/server/auth/mfa/service";
export async function beginMfaAction(raw: unknown) {
  const parsed = z.string().min(1).max(128).safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Informe sua senha." };
  try {
    return { ok: true as const, data: await beginMfa(parsed.data) };
  } catch {
    return {
      ok: false as const,
      error: "Não foi possível iniciar. Confira sua senha e tente novamente.",
    };
  }
}
export async function confirmMfaAction(raw: unknown) {
  const parsed = z
    .string()
    .regex(/^\d{6}$/)
    .safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Informe seis dígitos." };
  try {
    return { ok: true as const, data: await confirmMfa(parsed.data) };
  } catch {
    return {
      ok: false as const,
      error: "Código inválido, expirado ou usado. Aguarde e tente novamente.",
    };
  }
}

export async function manageMfaAction(raw: unknown) {
  const parsed = z
    .object({
      password: z.string().min(1).max(128),
      code: z.string().min(6).max(32),
      disable: z.boolean(),
    })
    .safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Informe senha e código válidos." };
  try {
    const { manageMfa } = await import("@/server/auth/mfa/service");
    return {
      ok: true as const,
      data: await manageMfa(parsed.data.password, parsed.data.code, parsed.data.disable),
    };
  } catch {
    return {
      ok: false as const,
      error: "Não foi possível alterar. Confira senha, código e política obrigatória de MFA.",
    };
  }
}
