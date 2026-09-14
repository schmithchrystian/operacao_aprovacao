import { randomUUID } from "node:crypto";
import type { SubscriptionPlan, SubscriptionStatus } from "@/generated/prisma/client";
import { inRepositoryTransaction } from "../transaction";
import { ConflictError } from "@/server/errors";

export async function hasSubscriptionAccess(userId: string): Promise<boolean> {
  const { prisma } = await import("@/server/db/prisma");
  return !!(await prisma.subscription.findFirst({
    where: {
      userId,
      provider: "stripe",
      accessBlockedReason: null,
      plan: { not: "FREE" },
      status: { in: ["ACTIVE", "TRIALING"] },
      currentPeriodEnd: { gt: new Date() },
    },
  }));
}
export async function reserveCheckout(userId: string) {
  return inRepositoryTransaction(async () => {
    const { prisma } = await import("@/server/db/prisma");
    await prisma.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    if (
      await prisma.subscription.findFirst({
        where: { userId, provider: "stripe", status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
      })
    )
      throw new ConflictError("Você já possui uma assinatura ativa.");
    const existing = await prisma.billingCheckout.findUnique({ where: { userId } });
    if (
      existing &&
      (existing.expiresAt
        ? existing.expiresAt.getTime() > Date.now()
        : existing.createdAt.getTime() + 24 * 60 * 60_000 > Date.now())
    )
      return existing;
    const data = {
      requestKey: randomUUID(),
      reconciledAt: null,
      sessionId: null,
      url: null,
      expiresAt: null,
      createdAt: new Date(),
    };
    return prisma.billingCheckout.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  });
}
export async function saveCheckout(
  userId: string,
  requestKey: string,
  sessionId: string,
  url: string,
  expiresAt: Date,
) {
  const { prisma } = await import("@/server/db/prisma");
  await prisma.billingCheckout.updateMany({
    where: { userId, requestKey },
    data: { sessionId, url, expiresAt },
  });
}
export async function persistSubscription(
  eventId: string,
  data: {
    userId: string;
    externalId: string;
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    accessBlockedReason?: string | null;
    reconciledAt?: Date;
  },
) {
  const { prisma } = await import("@/server/db/prisma");
  const existing = await prisma.subscription.findUnique({
    where: { provider_externalId: { provider: "stripe", externalId: data.externalId } },
  });
  if (existing && existing.userId !== data.userId)
    throw new ConflictError("Assinatura pertence a outra conta.");
  await prisma.user.findUniqueOrThrow({ where: { id: data.userId } });
  await prisma.subscription.upsert({
    where: { provider_externalId: { provider: "stripe", externalId: data.externalId } },
    create: { ...data, provider: "stripe" },
    update: data,
  });
  await prisma.billingWebhookReceipt.create({
    data: { id: eventId, subscriptionId: data.externalId },
  });
}
export async function isWebhookProcessed(eventId: string) {
  const { prisma } = await import("@/server/db/prisma");
  return !!(await prisma.billingWebhookReceipt.findUnique({ where: { id: eventId } }));
}

export async function latestSubscription(userId: string) {
  const { prisma } = await import("@/server/db/prisma");
  return prisma.subscription.findFirst({
    where: { userId, provider: "stripe", externalId: { not: null } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function checkoutForUser(userId: string) {
  const { prisma } = await import("@/server/db/prisma");
  return prisma.billingCheckout.findUnique({ where: { userId } });
}

export async function countActiveSubscriptions(now: Date): Promise<number> {
  const { prisma } = await import("@/server/db/prisma");
  return prisma.subscription.count({
    where: {
      provider: "stripe",
      accessBlockedReason: null,
      plan: { not: "FREE" },
      status: { in: ["ACTIVE", "TRIALING"] },
      currentPeriodEnd: { gt: now },
      user: { isActive: true, deletedAt: null },
    },
  });
}
