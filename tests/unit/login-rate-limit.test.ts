import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetRateLimitStore,
  buildRateLimitKey,
  checkLoginRateLimit,
  registerLoginFailure,
  resetLoginAttempts,
} from "@/server/auth/rate-limit";
import { LOGIN_RATE_LIMIT } from "@/config/business";

describe("login rate limit / lockout", () => {
  beforeEach(() => {
    __resetRateLimitStore();
  });

  it("não bloqueia uma chave nova", () => {
    const key = buildRateLimitKey("ana.recruta@example.com");
    expect(checkLoginRateLimit(key).blocked).toBe(false);
  });

  it("bloqueia a chave ao atingir maxFailures dentro da janela", () => {
    const key = buildRateLimitKey("ana.recruta@example.com", "203.0.113.9");

    let status = { blocked: false } as ReturnType<typeof registerLoginFailure>;
    for (let i = 0; i < LOGIN_RATE_LIMIT.maxFailures; i += 1) {
      status = registerLoginFailure(key);
    }

    expect(status.blocked).toBe(true);
    expect(status.retryAfterMs).toBeGreaterThan(0);
    // Uma verificação subsequente (sem nova tentativa) continua bloqueada.
    expect(checkLoginRateLimit(key).blocked).toBe(true);
  });

  it("não bloqueia enquanto ficar abaixo de maxFailures", () => {
    const key = buildRateLimitKey("ana.recruta@example.com");

    for (let i = 0; i < LOGIN_RATE_LIMIT.maxFailures - 1; i += 1) {
      expect(registerLoginFailure(key).blocked).toBe(false);
    }
    expect(checkLoginRateLimit(key).blocked).toBe(false);
  });

  it("libera a chave depois que o lockout expira", () => {
    const key = buildRateLimitKey("ana.recruta@example.com");
    const t0 = 1_000_000;

    for (let i = 0; i < LOGIN_RATE_LIMIT.maxFailures; i += 1) {
      registerLoginFailure(key, t0);
    }
    expect(checkLoginRateLimit(key, t0).blocked).toBe(true);

    const afterLockout = t0 + LOGIN_RATE_LIMIT.lockoutMs + 1;
    expect(checkLoginRateLimit(key, afterLockout).blocked).toBe(false);
  });

  it("resetLoginAttempts zera o contador (ex.: após login bem-sucedido)", () => {
    const key = buildRateLimitKey("ana.recruta@example.com");

    for (let i = 0; i < LOGIN_RATE_LIMIT.maxFailures; i += 1) {
      registerLoginFailure(key);
    }
    expect(checkLoginRateLimit(key).blocked).toBe(true);

    resetLoginAttempts(key);
    expect(checkLoginRateLimit(key).blocked).toBe(false);
  });

  it("a chave inclui o IP quando disponível, isolando contadores por origem", () => {
    expect(buildRateLimitKey("ana@example.com", "203.0.113.1")).not.toBe(
      buildRateLimitKey("ana@example.com", "203.0.113.2"),
    );
    expect(buildRateLimitKey("ANA@example.com")).toBe(buildRateLimitKey("ana@example.com"));
  });
});
