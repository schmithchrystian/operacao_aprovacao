import { z } from "zod";

/**
 * Config central tipada por Zod (ADR-0010, docs/ARCHITECTURE.md).
 * Fonte única de verdade para variáveis de ambiente do servidor.
 * Nunca ler `process.env` diretamente fora deste módulo.
 */
/** Valor default de `AUTH_SECRET` — só serve para não travar dev/test locais (ver ADR-0005). */
const DEV_AUTH_SECRET = "dev-only-insecure-secret-do-not-use-in-production";

/** Valor default de `CRON_SECRET` — só serve para não travar dev/test locais (ver ADR-0009). */
const DEV_CRON_SECRET = "dev-only-insecure-cron-secret-do-not-use-in-production";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    /** Seleciona a implementação de repositório (ADR-0002). Default: mock. */
    DATA_SOURCE: z.enum(["mock", "prisma"]).default("mock"),
    /**
     * Conexao pooled usada pelo Prisma Client em runtime. A URL direta e exclusiva das
     * migrations/seed no CLI e, por isso, nao e lida pela aplicacao web.
     */
    DATABASE_URL: z.string().url().optional(),
    /**
     * Segredo do Auth.js (NextAuth v5) para assinar/criptografar o JWT de sessão (ADR-0005).
     * Cai para um valor de dev quando ausente para não travar ambiente local — nunca aceito
     * em produção (ver `.superRefine` abaixo).
     */
    AUTH_SECRET: z.string().min(1).default(DEV_AUTH_SECRET),
    /**
     * Segredo compartilhado que protege as rotas `/api/cron/*` (ADR-0009, Fase 9). O
     * disparador (scheduler externo ou chamada manual) deve enviar este valor via header
     * `Authorization: Bearer <segredo>` ou `x-cron-secret`. Cai para um valor de dev quando
     * ausente para não travar ambiente local — nunca aceito em produção.
     */
    CRON_SECRET: z.string().min(1).default(DEV_CRON_SECRET),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === "production" && value.AUTH_SECRET === DEV_AUTH_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["AUTH_SECRET"],
        message: "AUTH_SECRET é obrigatório em produção (não usar o valor default de dev).",
      });
    }
    if (value.NODE_ENV === "production" && value.CRON_SECRET === DEV_CRON_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["CRON_SECRET"],
        message: "CRON_SECRET é obrigatório em produção (não usar o valor default de dev).",
      });
    }
    if (value.DATA_SOURCE === "prisma" && !value.DATABASE_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "DATABASE_URL e obrigatoria quando DATA_SOURCE=prisma.",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    DATA_SOURCE: process.env.DATA_SOURCE,
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    CRON_SECRET: process.env.CRON_SECRET,
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
