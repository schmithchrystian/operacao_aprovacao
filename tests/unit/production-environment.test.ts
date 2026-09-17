import { afterEach, describe, expect, it, vi } from "vitest";
const secret = "test-only-random-length-secret-000000000000";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});
function production() {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("AUTH_SECRET", secret);
  vi.stubEnv("CRON_SECRET", secret);
  vi.stubEnv("APP_ENV", "production");
}
describe("commercial environment guards", () => {
  it("rejects production mock even with independent secrets", async () => {
    production();
    vi.stubEnv("DATA_SOURCE", "mock");
    await expect(import("@/config/env")).rejects.toThrow("Configuração");
  });
  it("requires a database for production persistence", async () => {
    production();
    vi.stubEnv("DATA_SOURCE", "prisma");
    vi.stubEnv("DATABASE_URL", undefined);
    await expect(import("@/config/env")).rejects.toThrow("Configuração");
  });
  it("requires sufficiently long production secrets", async () => {
    production();
    vi.stubEnv("APP_ENV", "demo");
    vi.stubEnv("DATA_SOURCE", "mock");
    vi.stubEnv("AUTH_SECRET", "short");
    await expect(import("@/config/env")).rejects.toThrow("Configuração");
  });
  it("allows explicit isolated demonstration mode", async () => {
    production();
    vi.stubEnv("APP_ENV", "demo");
    vi.stubEnv("DATA_SOURCE", "mock");
    expect((await import("@/config/env")).env.DATA_SOURCE).toBe("mock");
  });
});
