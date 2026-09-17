import { AsyncLocalStorage } from "node:async_hooks";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "@/config/env";
import { ValidationError } from "@/server/errors";

export function isBillingConfigured(): boolean {
  return (
    env.DATA_SOURCE === "prisma" &&
    !!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.STRIPE_PRICE_ID)
  );
}
const deadlines = new AsyncLocalStorage<number>();
export function withStripeDeadline<T>(milliseconds: number, work: () => Promise<T>): Promise<T> {
  return deadlines.run(Math.min(deadlines.getStore() ?? Infinity, Date.now() + milliseconds), work);
}
export async function stripeRequest(
  path: string,
  body?: URLSearchParams,
  idempotencyKey?: string,
): Promise<unknown> {
  if (!isBillingConfigured()) throw new Error("Cobrança não configurada.");
  const remaining = Math.min(8000, (deadlines.getStore() ?? Infinity) - Date.now());
  if (remaining <= 0) throw new Error("Prazo de conciliação excedido.");
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: body ? "POST" : "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(Math.ceil(remaining)),
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Stripe-Version": "2025-03-31.basil",
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body,
  });
  if (!response.ok) throw new Error("Serviço de cobrança temporariamente indisponível.");
  return response.json();
}
const recurringSchema = z.object({
  interval: z.enum(["month", "year"]),
  interval_count: z.number().int().positive(),
});
export const priceSchema = z.object({
  id: z.string(),
  active: z.boolean(),
  unit_amount: z.number().int().nonnegative().nullable(),
  currency: z.string(),
  recurring: recurringSchema,
});
export function planFromRecurring(
  recurring: z.infer<typeof recurringSchema>,
): "MONTHLY" | "QUARTERLY" | "YEARLY" {
  if (recurring.interval === "month" && recurring.interval_count === 1) return "MONTHLY";
  if (recurring.interval === "month" && recurring.interval_count === 3) return "QUARTERLY";
  if (recurring.interval === "year" && recurring.interval_count === 1) return "YEARLY";
  throw new ValidationError("Periodicidade do plano não suportada.");
}
export async function getConfiguredPrice() {
  const price = priceSchema.parse(
    await stripeRequest(`prices/${encodeURIComponent(env.STRIPE_PRICE_ID!)}`),
  );
  if (!price.active) throw new Error("Plano indisponível.");
  planFromRecurring(price.recurring);
  return price;
}
export const subscriptionSchema = z.object({
  id: z.string().startsWith("sub_"),
  latest_invoice: z.union([z.string(), z.object({ id: z.string() }), z.null()]),
  customer: z.union([z.string(), z.object({ id: z.string() })]),
  status: z.enum([
    "active",
    "trialing",
    "past_due",
    "canceled",
    "unpaid",
    "incomplete",
    "incomplete_expired",
    "paused",
  ]),
  metadata: z.object({ userId: z.string().min(1) }),
  cancel_at_period_end: z.boolean(),
  items: z.object({
    data: z.array(
      z.object({
        current_period_start: z.number().int(),
        current_period_end: z.number().int(),
        price: z.object({ id: z.string(), recurring: recurringSchema.nullable() }),
      }),
    ),
  }),
});
export async function retrieveSubscription(id: string) {
  return subscriptionSchema.parse(await stripeRequest(`subscriptions/${encodeURIComponent(id)}`));
}
const eventSchema = z.object({
  id: z.string().startsWith("evt_"),
  type: z.string(),
  data: z.object({
    object: z.object({
      id: z.string(),
      subscription: z.union([z.string(), z.object({ id: z.string() }), z.null()]).optional(),
    }),
  }),
});
export function verifyWebhook(raw: string, signature: string | null, now = Date.now()) {
  if (!env.STRIPE_WEBHOOK_SECRET || !signature || Buffer.byteLength(raw) > 1024 * 1024)
    throw new ValidationError("Webhook inválido.");
  const fields = signature.split(",").map((item) => item.trim().split("="));
  const timestamp = fields.find(([key]) => key === "t")?.[1];
  if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300)
    throw new ValidationError("Webhook inválido.");
  const expected = createHmac("sha256", env.STRIPE_WEBHOOK_SECRET)
    .update(`${timestamp}.${raw}`)
    .digest();
  const valid = fields.some(
    ([key, value]) =>
      key === "v1" &&
      !!value &&
      /^[a-f0-9]{64}$/i.test(value) &&
      timingSafeEqual(expected, Buffer.from(value, "hex")),
  );
  if (!valid) throw new ValidationError("Webhook inválido.");
  return eventSchema.parse(JSON.parse(raw));
}
