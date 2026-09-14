import { z } from "zod";
const email = z
  .string()
  .trim()
  .email("Informe um e-mail válido.")
  .max(254)
  .transform((value) => value.toLowerCase());
export const accountPasswordSchema = z
  .string()
  .min(12, "Use pelo menos 12 caracteres.")
  .max(72, "Use no máximo 72 caracteres.")
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    "A senha deve ter no máximo 72 bytes.",
  );
export const registerAccountSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(120),
  email,
  password: accountPasswordSchema,
});
export const requestAccountEmailSchema = z.object({ email });
export const accountTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/, "Link inválido ou expirado.");
export const verifyAccountSchema = z.object({ token: accountTokenSchema });
export const resetAccountPasswordSchema = z.object({
  token: accountTokenSchema,
  password: accountPasswordSchema,
});

export const requestVerificationSchema = z.object({ email, password: accountPasswordSchema });
