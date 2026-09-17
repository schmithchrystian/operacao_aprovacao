// @vitest-environment node
import { createHash, createHmac, randomUUID } from "node:crypto";
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("@/server/auth", () => ({ auth: authMock }));
const prefix = `billing-test-${randomUUID()}`;
const userId = `${prefix}-user`;
const subscriptionId = `sub_${prefix}`;
const secret = "whsec_synthetic-test-only-not-a-secret";
const testUrl = process.env.TEST_DATABASE_URL;
let prisma: typeof import("@/server/db/prisma").prisma;
let processWebhook: typeof import("@/server/billing/service").processWebhook;
let createCheckout: typeof import("@/server/billing/service").createCheckout;
let assertSubscriptionAccess: typeof import("@/server/billing/entitlement").assertSubscriptionAccess;
const fetchMock = vi.fn();
function canonical(status = "active", owner = userId, priceId = "price_synthetic") {
  return {
    id: subscriptionId,
    latest_invoice: "in_synthetic",
    customer: "cus_synthetic",
    status,
    metadata: { userId: owner },
    cancel_at_period_end: false,
    items: {
      data: [
        {
          current_period_start: Math.floor(Date.now() / 1000) - 60,
          current_period_end: Math.floor(Date.now() / 1000) + 3600,
          price: { id: priceId, recurring: { interval: "month", interval_count: 1 } },
        },
      ],
    },
  };
}
function signed(id: string, timestamp = Math.floor(Date.now() / 1000)) {
  const raw = JSON.stringify({
    id: `evt_${prefix}-${id}`,
    type: "customer.subscription.updated",
    data: { object: { id: subscriptionId } },
  });
  const signature = `t=${timestamp},v1=${createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest("hex")}`;
  return { raw, signature, id: `evt_${prefix}-${id}` };
}
describe.skipIf(!testUrl)("billing contracts — real PostgreSQL, synthetic Stripe transport", () => {
  beforeAll(async () => {
    const url = new URL(testUrl!);
    if (
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      !url.pathname.includes("test")
    )
      throw new Error("Use a local test database.");
    Object.assign(process.env, {
      DATABASE_URL: testUrl,
      DATA_SOURCE: "prisma",
      BILLING_REQUIRED: "true",
      STRIPE_SECRET_KEY: "sk_test_synthetic",
      STRIPE_WEBHOOK_SECRET: secret,
      STRIPE_PRICE_ID: "price_synthetic",
    });
    ({ prisma } = await import("@/server/db/prisma"));
    ({ processWebhook, createCheckout } = await import("@/server/billing/service"));
    ({ assertSubscriptionAccess } = await import("@/server/billing/entitlement"));
    await prisma.user.create({
      data: {
        id: userId,
        name: "Synthetic billing test",
        email: `${prefix}@example.invalid`,
        passwordHash: "not-a-login-hash",
      },
    });
    authMock.mockResolvedValue({ user: { id: userId, role: "aluno", sessionVersion: 0 } });
  });
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", async (url: string, options: RequestInit) =>
      url.includes("/invoices/")
        ? Response.json({
            id: "in_synthetic",
            status: "paid",
            amount_paid: 0,
            parent: { subscription_details: { subscription: subscriptionId } },
          })
        : fetchMock(url, options),
    );
    fetchMock.mockImplementation(async () => Response.json(canonical()));
  });
  afterAll(async () => {
    vi.unstubAllGlobals();
    if (!prisma) return;
    await prisma.billingWebhookReceipt.deleteMany({ where: { subscriptionId } });
    await prisma.securityRateLimit.deleteMany({
      where: {
        key: {
          in: ["checkout", "portal", "billing-reconcile"].map((operation) =>
            createHash("sha256").update(`${operation}:${userId}`).digest("hex"),
          ),
        },
      },
    });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });
  it("rejects altered, stale and future signatures before contacting Stripe", async () => {
    const event = signed("invalid");
    await expect(processWebhook(event.raw + " ", event.signature)).rejects.toThrow();
    for (const offset of [-3600, 3600]) {
      const e = signed("invalid", Math.floor(Date.now() / 1000) + offset);
      await expect(processWebhook(e.raw, e.signature)).rejects.toThrow();
    }
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(assertSubscriptionAccess(userId)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("reuses a persisted checkout and derives owner/price exclusively from the server", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("/prices/")
        ? Response.json({
            id: "price_synthetic",
            active: true,
            unit_amount: 4990,
            currency: "brl",
            recurring: { interval: "month", interval_count: 1 },
          })
        : Response.json({
            id: "cs_synthetic",
            url: "https://checkout.stripe.com/c/pay/synthetic",
            expires_at: Math.floor(Date.now() / 1000) + 86400,
          }),
    );
    const first = await createCheckout();
    expect(await createCheckout()).toBe(first);
    const posts = fetchMock.mock.calls.filter(([, options]) => options.method === "POST");
    expect(posts).toHaveLength(1);
    const params = posts[0]![1].body as URLSearchParams;
    expect(params.get("subscription_data[metadata][userId]")).toBe(userId);
    expect(params.get("line_items[0][price]")).toBe("price_synthetic");
    expect(posts[0]![1].headers["Idempotency-Key"]).toBeTruthy();
  });
  it("commits one receipt for concurrent duplicate webhooks and grants access from canonical state", async () => {
    const event = signed("duplicate");
    await Promise.all([
      processWebhook(event.raw, event.signature),
      processWebhook(event.raw, event.signature),
    ]);
    expect(await prisma.billingWebhookReceipt.count({ where: { id: event.id } })).toBe(1);
    expect(await prisma.subscription.count({ where: { externalId: subscriptionId } })).toBe(1);
    await expect(assertSubscriptionAccess(userId)).resolves.toBeUndefined();
  });
  it("an old event cannot resurrect canceled access because the current subscription is retrieved", async () => {
    fetchMock.mockImplementation(async () => Response.json(canonical("canceled")));
    const event = signed("late-update");
    await processWebhook(event.raw, event.signature);
    await expect(assertSubscriptionAccess(userId)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(
      (await prisma.subscription.findFirstOrThrow({ where: { externalId: subscriptionId } }))
        .status,
    ).toBe("CANCELED");
  });
  it("rejects ownership changes atomically without acknowledging the event", async () => {
    fetchMock.mockImplementation(async () => Response.json(canonical("active", "different-user")));
    const event = signed("wrong-owner");
    await expect(processWebhook(event.raw, event.signature)).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(await prisma.billingWebhookReceipt.findUnique({ where: { id: event.id } })).toBeNull();
    expect(
      (await prisma.subscription.findFirstOrThrow({ where: { externalId: subscriptionId } }))
        .userId,
    ).toBe(userId);
  });
  it("does not grant access for a price outside the configured entitlement", async () => {
    fetchMock.mockImplementation(async () =>
      Response.json(canonical("active", userId, "price_other")),
    );
    const event = signed("other-price");
    await processWebhook(event.raw, event.signature);
    await expect(assertSubscriptionAccess(userId)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("opens a portal only for the authenticated owner's canonical customer", async () => {
    const { createBillingPortal } = await import("@/server/billing/service");
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("billing_portal")
        ? Response.json({ url: "https://billing.stripe.com/p/session/synthetic" })
        : Response.json(canonical("canceled")),
    );
    expect(await createBillingPortal()).toBe("https://billing.stripe.com/p/session/synthetic");
    const request = fetchMock.mock.calls.find(([url]) => url.includes("billing_portal"));
    expect(request?.[1].body.get("customer")).toBe("cus_synthetic");
    fetchMock.mockImplementation(async () => Response.json(canonical("active", "other-owner")));
    await expect(createBillingPortal()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("reconciles a missing webhook using canonical subscription state", async () => {
    const { reconcileOwnSubscription } = await import("@/server/billing/service");
    fetchMock.mockImplementation(async () => Response.json(canonical("active")));
    await reconcileOwnSubscription();
    await expect(assertSubscriptionAccess(userId)).resolves.toBeUndefined();
  });
  it("persists risk separately from Stripe status and only restores access on canonical recovery", async () => {
    let amountRefunded = 1000;
    let dispute: string | null = null;
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.includes("/subscriptions/")) return Response.json(canonical());
      if (url.includes("/invoices/"))
        return Response.json({
          id: "in_synthetic",
          status: "paid",
          amount_paid: 1000,
          parent: { subscription_details: { subscription: subscriptionId } },
        });
      if (url.includes("/invoice_payments?"))
        return Response.json({
          has_more: false,
          data: [
            {
              invoice: "in_synthetic",
              amount_paid: 1000,
              payment: { type: "payment_intent", payment_intent: "pi_synthetic" },
            },
          ],
        });
      if (url.includes("/payment_intents/"))
        return Response.json({ latest_charge: "ch_synthetic" });
      if (url.includes("/charges/"))
        return Response.json({
          id: "ch_synthetic",
          amount: 1000,
          amount_refunded: amountRefunded,
          disputed: !!dispute,
        });
      if (url.includes("/refunds?"))
        return Response.json({
          has_more: false,
          data: [{ amount: amountRefunded, status: "succeeded" }],
        });
      if (url.includes("/disputes?"))
        return Response.json({ has_more: false, data: [{ status: dispute }] });
      throw new Error("Unexpected URL");
    });
    let event = signed("full-refund");
    await processWebhook(event.raw, event.signature);
    const row = await prisma.subscription.findFirstOrThrow({
      where: { externalId: subscriptionId },
    });
    expect(row.status).toBe("ACTIVE");
    expect(row.accessBlockedReason).toBe("FULL_REFUND");
    await expect(assertSubscriptionAccess(userId)).rejects.toMatchObject({ code: "FORBIDDEN" });
    amountRefunded = 0;
    dispute = "under_review";
    event = signed("dispute");
    await processWebhook(event.raw, event.signature);
    await expect(assertSubscriptionAccess(userId)).rejects.toMatchObject({ code: "FORBIDDEN" });
    dispute = "won";
    event = signed("dispute-won");
    await processWebhook(event.raw, event.signature);
    await expect(assertSubscriptionAccess(userId)).resolves.toBeUndefined();
    expect(
      (await prisma.subscription.findFirstOrThrow({ where: { externalId: subscriptionId } }))
        .accessBlockedReason,
    ).toBeNull();
  });

  it("scheduled reconciliation claims a PostgreSQL row once under concurrent runs", async () => {
    const { reconcileBillingBatch } = await import("@/server/billing/reconciliation");
    await prisma.subscription.updateMany({
      where: { externalId: subscriptionId },
      data: { reconciledAt: new Date(0) },
    });
    const before = await prisma.billingWebhookReceipt.count({ where: { subscriptionId } });
    await Promise.all([reconcileBillingBatch(), reconcileBillingBatch()]);
    expect(await prisma.billingWebhookReceipt.count({ where: { subscriptionId } })).toBe(
      before + 1,
    );
    expect(
      (
        await prisma.subscription.findFirstOrThrow({ where: { externalId: subscriptionId } })
      ).reconciledAt!.getTime(),
    ).toBeGreaterThan(Date.now() - 60_000);
  });
  it.each([
    ["invoice.paid", "active", "ACTIVE"],
    ["invoice.payment_failed", "past_due", "PAST_DUE"],
  ])(
    "%s synchronizes canonical subscription state immediately",
    async (type, canonicalStatus, expectedStatus) => {
      fetchMock.mockImplementation(async () => Response.json(canonical(canonicalStatus)));
      const eventId = `evt_${prefix}-${type}`;
      const raw = JSON.stringify({
        id: eventId,
        type,
        data: { object: { id: "in_synthetic", subscription: "sub_forged_payload_ignored" } },
      });
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = `t=${timestamp},v1=${createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest("hex")}`;
      await processWebhook(raw, signature);
      const subscription = await prisma.subscription.findFirstOrThrow({
        where: { externalId: subscriptionId },
      });
      expect(subscription.status).toBe(expectedStatus);
      expect(
        await prisma.billingWebhookReceipt.findUnique({
          where: { id: `${eventId}:${subscriptionId}` },
        }),
      ).not.toBeNull();
      if (canonicalStatus === "active")
        await expect(assertSubscriptionAccess(userId)).resolves.toBeUndefined();
      else
        await expect(assertSubscriptionAccess(userId)).rejects.toMatchObject({ code: "FORBIDDEN" });
    },
  );
});
