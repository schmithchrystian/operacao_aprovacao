import { z } from "zod";

/**
 * Config central tipada por Zod (ADR-0010, docs/ARCHITECTURE.md).
 * Fonte única de verdade para variáveis de ambiente do servidor.
 * Nunca ler `process.env` diretamente fora deste módulo.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /** Seleciona a implementação de repositório (ADR-0002). Default: mock. */
  DATA_SOURCE: z.enum(["mock", "prisma"]).default("mock"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    DATA_SOURCE: process.env.DATA_SOURCE,
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
