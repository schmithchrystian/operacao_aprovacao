import path from "node:path";
import { defineConfig } from "vitest/config";

if (!process.env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL deve apontar para PostgreSQL de testes isolado.");
const url = new URL(process.env.TEST_DATABASE_URL);
if (!url.pathname.toLowerCase().includes("test")) throw new Error("O nome do banco de integração deve conter test.");
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.DATA_SOURCE = "prisma";
process.env.APP_ENV = "test";

export default defineConfig({
  test: { environment: "node", include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false, testTimeout: 30_000, hookTimeout: 30_000 },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
