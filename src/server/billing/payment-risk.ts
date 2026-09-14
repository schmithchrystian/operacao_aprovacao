import { z } from "zod";
import { stripeRequest } from "./stripe";

const reference = z.union([z.string(), z.object({ id: z.string() })]);
const idOf = (value: z.infer<typeof reference>) => (typeof value === "string" ? value : value.id);
const invoiceSchema = z.object({
  id: z.string(),
  status: z.enum(["draft", "open", "paid", "uncollectible", "void"]).nullable(),
  amount_paid: z.number().int().nonnegative(),
  parent: z
    .object({ subscription_details: z.object({ subscription: reference }).nullable().optional() })
    .nullable(),
});
const paymentsSchema = z.object({
  has_more: z.boolean(),
  data: z.array(
    z.object({
      invoice: reference,
      amount_paid: z.number().int().nonnegative().nullable(),
      payment: z.object({ type: z.string(), payment_intent: reference.optional() }),
    }),
  ),
});
const chargeSchema = z.object({
  id: z.string(),
  amount: z.number().int().nonnegative(),
  amount_refunded: z.number().int().nonnegative(),
  disputed: z.boolean(),
});
export type PaymentBlock = "FULL_REFUND" | "DISPUTE" | "PAYMENT_REVIEW_REQUIRED" | null;

/** Local entitlement policy, never changes or cancels the external subscription. */
export async function currentInvoicePaymentBlock(
  subscriptionId: string,
  invoiceId: string | null,
): Promise<PaymentBlock> {
  if (!invoiceId) return "PAYMENT_REVIEW_REQUIRED";
  const invoice = invoiceSchema.parse(
    await stripeRequest(`invoices/${encodeURIComponent(invoiceId)}`),
  );
  if (
    invoice.id !== invoiceId ||
    !invoice.parent?.subscription_details ||
    idOf(invoice.parent.subscription_details.subscription) !== subscriptionId
  )
    throw new Error("Vínculo da fatura inválido.");
  if (invoice.status !== "paid") return "PAYMENT_REVIEW_REQUIRED";
  if (invoice.amount_paid === 0) return null; // Valid free/credit-covered invoice, not a refunded charge.
  const payments = paymentsSchema.parse(
    await stripeRequest(
      `invoice_payments?${new URLSearchParams({ invoice: invoiceId, status: "paid", limit: "10" })}`,
    ),
  );
  if (payments.has_more || !payments.data.length) return "PAYMENT_REVIEW_REQUIRED";
  let refunded = 0;
  for (const payment of payments.data) {
    if (payment.amount_paid === null || payment.amount_paid <= 0) return "PAYMENT_REVIEW_REQUIRED";
    if (idOf(payment.invoice) !== invoiceId) throw new Error("Pagamento de outra fatura.");
    if (payment.payment.type !== "payment_intent" || !payment.payment.payment_intent)
      return "PAYMENT_REVIEW_REQUIRED";
    const intent = z
      .object({ latest_charge: reference.nullable() })
      .parse(
        await stripeRequest(
          `payment_intents/${encodeURIComponent(idOf(payment.payment.payment_intent))}`,
        ),
      );
    if (!intent.latest_charge) return "PAYMENT_REVIEW_REQUIRED";
    const chargeId = idOf(intent.latest_charge);
    const charge = chargeSchema.parse(
      await stripeRequest(`charges/${encodeURIComponent(chargeId)}`),
    );
    if (charge.id !== chargeId) throw new Error("Cobrança inválida.");
    if (charge.amount <= 0) return "PAYMENT_REVIEW_REQUIRED";
    // Count only succeeded refunds: pending/failed refunds are not confirmed loss of payment.
    let succeededRefunds = 0;
    if (charge.amount_refunded > 0) {
      const refunds = z
        .object({
          has_more: z.boolean(),
          data: z.array(
            z.object({
              amount: z.number().int().nonnegative(),
              status: z.enum(["pending", "requires_action", "succeeded", "failed", "canceled"]),
            }),
          ),
        })
        .parse(
          await stripeRequest(`refunds?${new URLSearchParams({ charge: charge.id, limit: "10" })}`),
        );
      if (refunds.has_more || !refunds.data.length) return "PAYMENT_REVIEW_REQUIRED";
      succeededRefunds = refunds.data
        .filter((refund) => refund.status === "succeeded")
        .reduce((sum, refund) => sum + refund.amount, 0);
    }
    // Proportionally attribute refunds if one payment funds multiple invoices.
    refunded += charge.amount > 0 ? (payment.amount_paid * succeededRefunds) / charge.amount : 0;
    if (charge.disputed) {
      const disputes = z
        .object({
          has_more: z.boolean(),
          data: z.array(
            z.object({
              status: z.enum([
                "warning_needs_response",
                "warning_under_review",
                "warning_closed",
                "needs_response",
                "under_review",
                "won",
                "lost",
              ]),
            }),
          ),
        })
        .parse(
          await stripeRequest(
            `disputes?${new URLSearchParams({ charge: charge.id, limit: "10" })}`,
          ),
        );
      if (disputes.has_more || !disputes.data.length) return "PAYMENT_REVIEW_REQUIRED";
      if (disputes.data.some((d) => ["needs_response", "under_review", "lost"].includes(d.status)))
        return "DISPUTE";
    }
  }
  return refunded >= invoice.amount_paid ? "FULL_REFUND" : null;
}

/** Resolve charge/refund/dispute events through canonical payment → invoice → subscription. */
export async function subscriptionsForPaymentEvent(
  type: string,
  objectId: string,
): Promise<string[]> {
  if (type === "invoice.paid" || type === "invoice.payment_failed") {
    const invoice = invoiceSchema.parse(
      await stripeRequest(`invoices/${encodeURIComponent(objectId)}`),
    );
    if (invoice.id !== objectId) throw new Error("Fatura inválida.");
    return invoice.parent?.subscription_details
      ? [idOf(invoice.parent.subscription_details.subscription)]
      : [];
  }
  let chargeId = objectId;
  if (type.startsWith("charge.dispute.")) {
    const dispute = z
      .object({ charge: reference })
      .parse(await stripeRequest(`disputes/${encodeURIComponent(objectId)}`));
    chargeId = idOf(dispute.charge);
  } else if (type.startsWith("refund.")) {
    const refund = z
      .object({ charge: reference.nullable() })
      .parse(await stripeRequest(`refunds/${encodeURIComponent(objectId)}`));
    if (!refund.charge) return [];
    chargeId = idOf(refund.charge);
  }
  const charge = z
    .object({ payment_intent: reference.nullable() })
    .parse(await stripeRequest(`charges/${encodeURIComponent(chargeId)}`));
  if (!charge.payment_intent) return [];
  const payments = paymentsSchema.parse(
    await stripeRequest(
      `invoice_payments?${new URLSearchParams({ "payment[type]": "payment_intent", "payment[payment_intent]": idOf(charge.payment_intent), limit: "10" })}`,
    ),
  );
  if (payments.has_more) throw new Error("Conciliação requer revisão de pagamentos.");
  const ids = new Set<string>();
  for (const payment of payments.data) {
    const invoice = invoiceSchema.parse(
      await stripeRequest(`invoices/${encodeURIComponent(idOf(payment.invoice))}`),
    );
    if (invoice.parent?.subscription_details)
      ids.add(idOf(invoice.parent.subscription_details.subscription));
  }
  return [...ids];
}
