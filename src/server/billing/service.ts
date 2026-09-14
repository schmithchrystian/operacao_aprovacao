import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { env } from "@/config/env";
import { requireUser } from "@/server/authorization";
import { RateLimitError, ForbiddenError } from "@/server/errors";
import { withDomainLock } from "@/server/concurrency/domain-lock";
import { reserveLoginAttempt } from "@/server/repositories/prisma/security-rate-limit-repository";
import {
  isWebhookProcessed,
  persistSubscription,
  reserveCheckout,
  saveCheckout,
  latestSubscription,
  checkoutForUser,
} from "@/server/repositories/prisma/billing-repository";
import {
  getConfiguredPrice,
  isBillingConfigured,
  planFromRecurring,
  retrieveSubscription,
  stripeRequest,
  verifyWebhook,
} from "./stripe";

export async function createCheckout(): Promise<string> {
  const user = await requireUser();
  if (!isBillingConfigured()) throw new Error("Cobrança não configurada.");
  const key = createHash("sha256").update(`checkout:${user.userId}`).digest("hex");
  if (!(await reserveLoginAttempt(key))) throw new RateLimitError();
  const reservation = await reserveCheckout(user.userId);
  if (reservation.url && reservation.expiresAt && reservation.expiresAt.getTime() > Date.now())
    return reservation.url;
  await getConfiguredPrice();
  const params = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": env.STRIPE_PRICE_ID!,
    "line_items[0][quantity]": "1",
    client_reference_id: user.userId,
    "subscription_data[metadata][userId]": user.userId,
    "metadata[userId]": user.userId,
    success_url: `${env.APP_URL}/assinatura?checkout=success`,
    cancel_url: `${env.APP_URL}/assinatura?checkout=cancel`,
  });
  const session = z
    .object({ id: z.string(), url: z.string().url(), expires_at: z.number().int() })
    .parse(await stripeRequest("checkout/sessions", params, reservation.requestKey));
  const url = new URL(session.url);
  if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com")
    throw new Error("Destino de pagamento inválido.");
  await saveCheckout(
    user.userId,
    reservation.requestKey,
    session.id,
    session.url,
    new Date(session.expires_at * 1000),
  );
  return session.url;
}

export async function processWebhook(raw: string, signature: string | null): Promise<void> {
  if (!isBillingConfigured()) throw new Error("Cobrança não configurada.");
  const event = verifyWebhook(raw, signature);
  const object = event.data.object;
  let subscriptionId: string | undefined;
  if (
    [
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
    ].includes(event.type)
  )
    subscriptionId = object.id;
  else if (event.type === "checkout.session.completed")
    subscriptionId =
      typeof object.subscription === "string" ? object.subscription : object.subscription?.id;
  if (!subscriptionId?.startsWith("sub_")) return;
  await synchronizeSubscription(subscriptionId, event.id);
}

async function synchronizeSubscription(
  subscriptionId: string,
  eventId: string,
  expectedUserId?: string,
): Promise<void> {
  await withDomainLock(`stripe-subscription:${subscriptionId}`, async () => {
    if (await isWebhookProcessed(eventId)) return;
    // Read canonical state after the subscription lock, so out-of-order events cannot restore old access.
    const subscription = await retrieveSubscription(subscriptionId);
    if (
      subscription.id !== subscriptionId ||
      (expectedUserId && subscription.metadata.userId !== expectedUserId)
    )
      throw new ForbiddenError();
    const item = subscription.items.data.find((item) => item.price.id === env.STRIPE_PRICE_ID);
    const eligible = !!item?.price.recurring;
    const status = !eligible
      ? "EXPIRED"
      : subscription.status === "active"
        ? "ACTIVE"
        : subscription.status === "trialing"
          ? "TRIALING"
          : subscription.status === "past_due"
            ? "PAST_DUE"
            : subscription.status === "canceled"
              ? "CANCELED"
              : "EXPIRED";
    await persistSubscription(eventId, {
      userId: subscription.metadata.userId,
      externalId: subscription.id,
      plan: eligible ? planFromRecurring(item!.price.recurring!) : "FREE",
      status,
      currentPeriodStart: item ? new Date(item.current_period_start * 1000) : null,
      currentPeriodEnd: item ? new Date(item.current_period_end * 1000) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
  });
}

export async function createBillingPortal(): Promise<string> {
  const user = await requireUser();
  if (!isBillingConfigured()) throw new Error("Cobrança não configurada.");
  const key = createHash("sha256").update(`portal:${user.userId}`).digest("hex");
  if (!(await reserveLoginAttempt(key))) throw new RateLimitError();
  const existing = await latestSubscription(user.userId);
  if (!existing?.externalId) throw new ForbiddenError("Nenhuma assinatura encontrada.");
  const canonical = await retrieveSubscription(existing.externalId);
  if (canonical.metadata.userId !== user.userId) throw new ForbiddenError();
  const customer =
    typeof canonical.customer === "string" ? canonical.customer : canonical.customer.id;
  const result = z
    .object({ url: z.string().url() })
    .parse(
      await stripeRequest(
        "billing_portal/sessions",
        new URLSearchParams({ customer, return_url: `${env.APP_URL}/assinatura` }),
      ),
    );
  const url = new URL(result.url);
  if (url.protocol !== "https:" || url.hostname !== "billing.stripe.com")
    throw new Error("Destino de cobrança inválido.");
  return result.url;
}

export async function reconcileOwnSubscription(): Promise<void> {
  const user = await requireUser();
  if (!isBillingConfigured()) throw new Error("Cobrança não configurada.");
  const key = createHash("sha256").update(`billing-reconcile:${user.userId}`).digest("hex");
  if (!(await reserveLoginAttempt(key))) throw new RateLimitError();
  const existing = await latestSubscription(user.userId);
  let subscriptionId = existing?.externalId;
  if (!subscriptionId) {
    const checkout = await checkoutForUser(user.userId);
    if (!checkout?.sessionId) return;
    const session = z
      .object({ subscription: z.union([z.string(), z.object({ id: z.string() }), z.null()]) })
      .parse(await stripeRequest(`checkout/sessions/${encodeURIComponent(checkout.sessionId)}`));
    subscriptionId =
      typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  }
  if (subscriptionId)
    await synchronizeSubscription(subscriptionId, `reconcile-${randomUUID()}`, user.userId);
}
