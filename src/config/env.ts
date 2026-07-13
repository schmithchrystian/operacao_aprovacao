import { z } from "zod";

/**
 * Config central tipada por Zod (ADR-0010, docs/ARCHITECTURE.md).
 * Fonte única de verdade para variáveis de ambiente do servidor.
 * Nunca ler `process.env` diretamente fora deste módulo.
 */
/** Valor default de `AUTH_SECRET` — só serve para não travar dev/test locais (ver ADR-0005). */
const DEV_AUTH_SECRET = "dev-only-insecure-secret-do-not-use-in-production";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    /** Seleciona a implementação de repositório (ADR-0002). Default: mock. */
    DATA_SOURCE: z.enum(["mock", "prisma"]).default("mock"),
    /**
     * Segredo do Auth.js (NextAuth v5) para assinar/criptografar o JWT de sessão (ADR-0005).
     * Cai para um valor de dev quando ausente para não travar ambiente local — nunca aceito
     * em produção (ver `.superRefine` abaixo).
     */
    AUTH_SECRET: z.string().min(1).default(DEV_AUTH_SECRET),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === "production" && value.AUTH_SECRET === DEV_AUTH_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["AUTH_SECRET"],
        message: "AUTH_SECRET é obrigatório em produção (não usar o valor default de dev).",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    DATA_SOURCE: process.env.DATA_SOURCE,
    AUTH_SECRET: process.env.AUTH_SECRET,
  });

  if (!parsed.success) {
    console.error(
      "[config/env] Variáveis de ambiente inválidas:",
      parsed.error.flatten().fieldErrors,
    );
    throw new Error(
      "Configuração de ambiente inválida. Verifique as variáveis de ambiente do servidor.",
    );
  }

  return parsed.data;
}

export const env: Env = loadEnv();

export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
export const isDevelopment = env.NODE_ENV === "development";
