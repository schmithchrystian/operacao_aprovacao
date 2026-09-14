import { describe, it, expect } from "vitest";
import {
  totp,
  matchStep,
  encryptSecret,
  decryptSecret,
  newRecoveryCodes,
  recoveryHash,
} from "@/server/auth/mfa/crypto";
const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
describe("MFA RFC vectors and encryption", () => {
  it.each([
    [59, "94287082"],
    [1111111109, "07081804"],
    [1111111111, "14050471"],
    [1234567890, "89005924"],
    [2000000000, "69279037"],
    [20000000000, "65353130"],
  ])("matches RFC6238 at %i", (seconds, expected) => {
    expect(totp(secret, Math.floor(Number(seconds) / 30), 8)).toBe(expected);
  });
  it("accepts narrow clock skew and rejects stale/malformed code", () => {
    expect(matchStep(secret, totp(secret, 100), 101 * 30000)).toBe(100);
    expect(matchStep(secret, totp(secret, 100), 103 * 30000)).toBeNull();
    expect(matchStep(secret, "12345")).toBeNull();
  });
  it("binds ciphertext to user and detects tampering", () => {
    const key = "ab".repeat(32);
    const encrypted = encryptSecret(secret, key, "user1");
    expect(encrypted).not.toContain(secret);
    expect(decryptSecret(encrypted, key, "user1")).toBe(secret);
    expect(() => decryptSecret(encrypted, key, "user2")).toThrow();
    expect(() => decryptSecret(encrypted, "cd".repeat(32), "user1")).toThrow();
  });
  it("generates distinct high entropy recovery codes", () => {
    const codes = newRecoveryCodes();
    expect(new Set(codes).size).toBe(10);
    expect(codes.every((code) => /^[a-f0-9]{32}$/.test(code))).toBe(true);
    expect(recoveryHash(codes[0]!)).not.toBe(codes[0]);
  });
});
