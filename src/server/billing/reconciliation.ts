import { z } from "zod";
import { randomUUID } from "node:crypto";
import { isBillingConfigured, withStripeDeadline, stripeRequest } from "./stripe";
import { synchronizeSubscription } from "./service";

/** Rotate oldest attempts, including failures; concurrent invocations claim each row once. */
export async function reconcileBillingBatch() {
  if (!isBillingConfigured()) return { configured: false, attempted: 0, reconciled: 0, failed: 0 };
  const { prisma } = await import("@/server/db/prisma");
  const candidates = await prisma.subscription.findMany({
    where: {
      provider: "stripe",
      externalId: { not: null },
      OR: [{ reconciledAt: null }, { reconciledAt: { lt: new Date(Date.now() - 15 * 60_000) } }],
    },
    orderBy: [{ reconciledAt: { sort: "asc", nulls: "first" } }, { id: "asc" }],
    take: 5,
    select: { id: true, externalId: true, userId: true, reconciledAt: true },
  });
  const result = { configured: true, attempted: 0, reconciled: 0, failed: 0 };
  const deadline = Date.now() + 40_000;
  for (const row of candidates) {
    if (Date.now() >= deadline) break;
    const claimed = await prisma.subscription.updateMany({
      where: { id: row.id, reconciledAt: row.reconciledAt },
      data: { reconciledAt: new Date() },
    });
    if (!claimed.count) continue;
    result.attempted++;
    try {
      await withStripeDeadline(Math.max(1, deadline - Date.now()), () =>
        synchronizeSubscription(row.externalId!, `reconcile-${randomUUID()}`, row.userId),
      );
      result.reconciled++;
    } catch {
      result.failed++;
    }
  }
  const checkouts = await prisma.billingCheckout.findMany({
    where: {
      sessionId: { not: null },
      user: { subscriptions: { none: { provider: "stripe" } } },
      OR: [{ reconciledAt: null }, { reconciledAt: { lt: new Date(Date.now() - 15 * 60_000) } }],
    },
    orderBy: [{ reconciledAt: { sort: "asc", nulls: "first" } }, { userId: "asc" }],
    take: 5,
  });
  for (const row of checkouts) {
    if (Date.now() >= deadline) break;
    const claimed = await prisma.billingCheckout.updateMany({
      where: { userId: row.userId, sessionId: row.sessionId, reconciledAt: row.reconciledAt },
      data: { reconciledAt: new Date() },
    });
    if (!claimed.count) continue;
    result.attempted++;
    try {
      await withStripeDeadline(Math.min(15_000, Math.max(1, deadline - Date.now())), async () => {
        const session = z
          .object({ subscription: z.union([z.string(), z.object({ id: z.string() }), z.null()]) })
          .parse(await stripeRequest(`checkout/sessions/${encodeURIComponent(row.sessionId!)}`));
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        if (subscriptionId)
          await synchronizeSubscription(subscriptionId, `reconcile-${randomUUID()}`, row.userId);
      });
      result.reconciled++;
    } catch {
      result.failed++;
    }
  }
  return result;
}
