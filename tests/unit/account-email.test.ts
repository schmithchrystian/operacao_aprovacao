// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { createResendTransport, AccountConfigurationError } from "@/server/accounts/email";
import { trustedAccountIp } from "@/server/accounts/service";
import { accountPasswordSchema } from "@/contracts/account";
describe("account email transport and input boundary", () => {
  it("requires actual configuration before invoking a transport", () => {
    const fetcher = vi.fn();
    expect(() => createResendTransport({ fetcher })).toThrow(AccountConfigurationError);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("uses the configured sender and propagates provider failure without its response body", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("not delivered", { status: 503 }));
    const transport = createResendTransport({
      apiKey: "synthetic-key",
      from: "noreply@example.invalid",
      fetcher,
    });
    await expect(
      transport.send({
        to: "student@example.invalid",
        subject: "Confirmar",
        text: "synthetic message",
        idempotencyKey: "safe-test",
      }),
    ).rejects.toThrow("delivery failed");
    expect(fetcher).toHaveBeenCalledOnce();
    const options = fetcher.mock.calls[0]![1]!;
    expect(JSON.parse(options.body as string)).toEqual({
      from: "noreply@example.invalid",
      to: ["student@example.invalid"],
      subject: "Confirmar",
      text: "synthetic message",
    });
  });
  it("does not trust arbitrary forwarding headers or ambiguous IP chains", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4", "x-real-ip": "127.0.0.2" });
    expect(trustedAccountIp(headers)).toBeNull();
    expect(trustedAccountIp(headers, "x-real-ip")).toBe("127.0.0.2");
    expect(
      trustedAccountIp(new Headers({ "x-real-ip": "1.2.3.4,5.6.7.8" }), "x-real-ip"),
    ).toBeNull();
  });
  it("rejects short passwords and bcrypt UTF-8 truncation", () => {
    expect(accountPasswordSchema.safeParse("short").success).toBe(false);
    expect(accountPasswordSchema.safeParse("é".repeat(40)).success).toBe(false);
    expect(accountPasswordSchema.safeParse("Uma frase exclusiva 2026!").success).toBe(true);
  });
});
