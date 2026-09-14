// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import {
  accountEmailKey,
  encryptAccountEmail,
  decryptAccountEmail,
} from "@/server/accounts/email-encryption";
import { env } from "@/config/env";
const mocks = vi.hoisted(() => ({ process: vi.fn() }));
vi.mock("@/server/accounts/email-worker", () => ({ processAccountEmailQueue: mocks.process }));
import { GET } from "@/app/api/cron/account-emails/route";
import { NextRequest } from "next/server";
describe("encrypted account email and cron boundary", () => {
  it("requires a dedicated 256-bit key", () => {
    expect(() => accountEmailKey()).toThrow();
    expect(() => accountEmailKey("abc")).toThrow();
    expect(accountEmailKey(Buffer.alloc(32, 1).toString("base64"))).toHaveLength(32);
  });
  it("authenticates payload identity and TTL and rejects tampering", () => {
    const key = accountEmailKey(Buffer.alloc(32, 1).toString("base64")),
      expiresAt = new Date("2026-09-15T00:00:00Z"),
      message = {
        to: "synthetic@example.invalid",
        subject: "Confirmar",
        text: "sensitive-token-example",
        idempotencyKey: "synthetic-key",
      };
    const encrypted = encryptAccountEmail(message, key, "id", expiresAt);
    expect(encrypted).not.toContain(message.to);
    expect(encrypted).not.toContain(message.text);
    expect(decryptAccountEmail(encrypted, key, "id", expiresAt)).toEqual(message);
    expect(() => decryptAccountEmail(encrypted, key, "another-id", expiresAt)).toThrow();
    expect(() =>
      decryptAccountEmail(encrypted, key, "id", new Date(expiresAt.getTime() + 1)),
    ).toThrow();
    expect(() => decryptAccountEmail(encrypted, key, "id", expiresAt)).not.toThrow();
  });
  it("authenticates cron before processing any pending email", async () => {
    mocks.process.mockResolvedValue({ processed: 1 });
    expect(
      await GET(new NextRequest("https://example.invalid/api/cron/account-emails")),
    ).toHaveProperty("status", 401);
    expect(mocks.process).not.toHaveBeenCalled();
    expect(
      await GET(
        new NextRequest("https://example.invalid/api/cron/account-emails", {
          headers: { authorization: "Bearer " + env.CRON_SECRET },
        }),
      ),
    ).toHaveProperty("status", 200);
    expect(mocks.process).toHaveBeenCalledOnce();
  });
});
