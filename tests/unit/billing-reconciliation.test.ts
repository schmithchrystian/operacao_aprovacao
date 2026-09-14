// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  subscriptions: vi.fn(),
  claimSubscription: vi.fn(),
  checkouts: vi.fn(),
  claimCheckout: vi.fn(),
  sync: vi.fn(),
  request: vi.fn(),
}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    subscription: { findMany: mocks.subscriptions, updateMany: mocks.claimSubscription },
    billingCheckout: { findMany: mocks.checkouts, updateMany: mocks.claimCheckout },
  },
}));
vi.mock("@/server/billing/service", () => ({ synchronizeSubscription: mocks.sync }));
vi.mock("@/server/billing/stripe", () => ({
  isBillingConfigured: () => true,
  withStripeDeadline: (_: number, work: () => Promise<unknown>) => work(),
  stripeRequest: mocks.request,
}));
import { reconcileBillingBatch } from "@/server/billing/reconciliation";
beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  mocks.subscriptions.mockResolvedValue([]);
  mocks.checkouts.mockResolvedValue([]);
  mocks.claimSubscription.mockResolvedValue({ count: 1 });
  mocks.claimCheckout.mockResolvedValue({ count: 1 });
});
it("recovers a missed first webhook from the persisted checkout and verifies its owner", async () => {
  mocks.checkouts.mockResolvedValue([{ userId: "u1", sessionId: "cs_1", reconciledAt: null }]);
  mocks.request.mockResolvedValue({ subscription: "sub_1" });
  expect(await reconcileBillingBatch()).toMatchObject({ attempted: 1, reconciled: 1, failed: 0 });
  expect(mocks.sync).toHaveBeenCalledWith("sub_1", expect.stringContaining("reconcile-"), "u1");
});
it("skips rows another invocation already claimed", async () => {
  mocks.subscriptions.mockResolvedValue([
    { id: "s1", externalId: "sub_1", userId: "u1", reconciledAt: null },
  ]);
  mocks.claimSubscription.mockResolvedValue({ count: 0 });
  expect(await reconcileBillingBatch()).toMatchObject({ attempted: 0 });
  expect(mocks.sync).not.toHaveBeenCalled();
});
it("rotates failures without acknowledging them as reconciled and bounds the database selection", async () => {
  mocks.subscriptions.mockResolvedValue([
    { id: "s1", externalId: "sub_1", userId: "u1", reconciledAt: null },
    { id: "s2", externalId: "sub_2", userId: "u2", reconciledAt: null },
  ]);
  mocks.sync.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(undefined);
  expect(await reconcileBillingBatch()).toMatchObject({ attempted: 2, reconciled: 1, failed: 1 });
  expect(mocks.subscriptions).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
  expect(mocks.checkouts).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
  expect(mocks.claimSubscription).toHaveBeenCalledTimes(2);
});
