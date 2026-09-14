import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["docs/auditoria-2026-09-13/reproducoes.test.ts"],
  },
  resolve: { alias: { "@": path.resolve(process.cwd(), "src") } },
});
