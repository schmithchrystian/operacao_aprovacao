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
    APP_ENV: z.enum(["development", "test", "demo", "staging", "production"]).optional(),
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
    APP_URL: z.string().url().default("http://localhost:3000"),
    RESEND_API_KEY: z.string().min(1).optional(),
    ACCOUNT_EMAIL_ENCRYPTION_KEY: z
      .string()
      .regex(/^[A-Za-z0-9+/]{43}=$/)
      .optional(),
    EMAIL_FROM: z.string().min(1).optional(),
    TRUSTED_PROXY_IP_HEADER: z.enum(["x-vercel-forwarded-for", "x-real-ip"]).optional(),
    SUPABASE_URL: z.string().url().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    SUPABASE_VIDEO_BUCKET: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .default("lesson-videos"),
    SUPABASE_STORAGE_BUCKET: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .default("lesson-materials"),
    MFA_ENCRYPTION_KEY: z
      .string()
      .regex(/^[a-fA-F0-9]{64}$/)
      .optional(),
    ADMIN_MFA_REQUIRED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    STRIPE_SECRET_KEY: z.string().min(1).optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
    STRIPE_PRICE_ID: z.string().min(1).optional(),
    BILLING_REQUIRED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
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
    const deployed =
      value.APP_ENV === "production" ||
      value.APP_ENV === "staging" ||
      (value.NODE_ENV === "production" && value.APP_ENV !== "demo" && value.APP_ENV !== "test");
    if (deployed && value.APP_ENV !== "staging" && !value.ADMIN_MFA_REQUIRED) {
      ctx.addIssue({
        code: "custom",
        path: ["ADMIN_MFA_REQUIRED"],
        message: "Produção exige MFA administrativo habilitado.",
      });
    }
    if (value.ADMIN_MFA_REQUIRED && (value.DATA_SOURCE !== "prisma" || !value.MFA_ENCRYPTION_KEY)) {
      ctx.addIssue({
        code: "custom",
        path: ["ADMIN_MFA_REQUIRED"],
        message: "MFA administrativo exige Prisma e chave de criptografia própria.",
      });
    }
    if (deployed && value.DATA_SOURCE !== "prisma") {
      ctx.addIssue({
        code: "custom",
        path: ["DATA_SOURCE"],
        message:
          "Produção e staging exigem persistência Prisma; demonstrações devem usar APP_ENV=demo explicitamente.",
      });
    }
    if (deployed && !value.APP_URL.startsWith("https://")) {
      ctx.addIssue({
        code: "custom",
        path: ["APP_URL"],
        message: "Produção/staging exigem APP_URL HTTPS canônica.",
      });
    }
    if (deployed || value.NODE_ENV === "production") {
      for (const key of ["AUTH_SECRET", "CRON_SECRET"] as const) {
        if (value[key].length < 32)
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: "Use um segredo aleatório de pelo menos 32 caracteres.",
          });
      }
    }
    if ((deployed || value.NODE_ENV === "production") && value.AUTH_SECRET === DEV_AUTH_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["AUTH_SECRET"],
        message: "AUTH_SECRET é obrigatório em produção (não usar o valor default de dev).",
      });
    }
    if ((deployed || value.NODE_ENV === "production") && value.CRON_SECRET === DEV_CRON_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["CRON_SECRET"],
        message: "CRON_SECRET é obrigatório em produção (não usar o valor default de dev).",
      });
    }
    if (
      value.BILLING_REQUIRED &&
      (value.DATA_SOURCE !== "prisma" ||
        !value.STRIPE_SECRET_KEY ||
        !value.STRIPE_WEBHOOK_SECRET ||
        !value.STRIPE_PRICE_ID)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["BILLING_REQUIRED"],
        message: "Cobrança obrigatória exige Prisma e configuração completa do Stripe.",
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
    APP_ENV: process.env.APP_ENV,
    DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX,
    APP_URL: process.env.APP_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    ACCOUNT_EMAIL_ENCRYPTION_KEY: process.env.ACCOUNT_EMAIL_ENCRYPTION_KEY,
    TRUSTED_PROXY_IP_HEADER: process.env.TRUSTED_PROXY_IP_HEADER,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_VIDEO_BUCKET: process.env.SUPABASE_VIDEO_BUCKET,
    SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET,
    MFA_ENCRYPTION_KEY: process.env.MFA_ENCRYPTION_KEY,
    ADMIN_MFA_REQUIRED: process.env.ADMIN_MFA_REQUIRED,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID,
    BILLING_REQUIRED: process.env.BILLING_REQUIRED,
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
