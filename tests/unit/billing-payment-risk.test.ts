import { beforeEach, describe, expect, it, vi } from "vitest";
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/server/billing/stripe", () => ({ stripeRequest: request }));
import {
  currentInvoicePaymentBlock,
  subscriptionsForPaymentEvent,
} from "@/server/billing/payment-risk";
let refunded: number;
let disputeStatus: string | null;
let refundStatus: string;
beforeEach(() => {
  refunded = 0;
  disputeStatus = null;
  refundStatus = "succeeded";
  request.mockReset().mockImplementation(async (path: string) => {
    if (path.startsWith("invoices/"))
      return {
        id: "in_1",
        status: "paid",
        amount_paid: 1000,
        parent: { subscription_details: { subscription: "sub_1" } },
      };
    if (path.startsWith("invoice_payments?"))
      return {
        has_more: false,
        data: [
          {
            invoice: "in_1",
            amount_paid: 1000,
            payment: { type: "payment_intent", payment_intent: "pi_1" },
          },
        ],
      };
    if (path.startsWith("payment_intents/")) return { latest_charge: "ch_1" };
    if (path.startsWith("charges/"))
      return {
        id: "ch_1",
        amount: 1000,
        amount_refunded: refunded,
        disputed: !!disputeStatus,
        payment_intent: "pi_1",
      };
    if (path.startsWith("disputes?")) return { has_more: false, data: [{ status: disputeStatus }] };
    if (path.startsWith("disputes/")) return { charge: "ch_1" };
    if (path.startsWith("refunds?"))
      return { has_more: false, data: [{ amount: refunded, status: refundStatus }] };
    if (path.startsWith("refunds/")) return { charge: "ch_1" };
    throw new Error("Unexpected path");
  });
});
describe("canonical current-invoice entitlement policy", () => {
  it("keeps partial refunds eligible but blocks confirmed full refunds", async () => {
    refunded = 500;
    expect(await currentInvoicePaymentBlock("sub_1", "in_1")).toBeNull();
    refunded = 1000;
    expect(await currentInvoicePaymentBlock("sub_1", "in_1")).toBe("FULL_REFUND");
  });
  it.each(["pending", "failed", "canceled", "requires_action"])(
    "does not mistake a %s refund for confirmed payment loss",
    async (status) => {
      refunded = 1000;
      refundStatus = status;
      expect(await currentInvoicePaymentBlock("sub_1", "in_1")).toBeNull();
    },
  );
  it.each(["needs_response", "under_review", "lost"])("blocks %s disputes", async (status) => {
    disputeStatus = status;
    expect(await currentInvoicePaymentBlock("sub_1", "in_1")).toBe("DISPUTE");
  });
  it.each(["won", "warning_closed", "warning_needs_response", "warning_under_review"])(
    "does not treat %s as a lost payment",
    async (status) => {
      disputeStatus = status;
      expect(await currentInvoicePaymentBlock("sub_1", "in_1")).toBeNull();
    },
  );
  it("fails incomplete evidence closed and never turns transport errors into approval", async () => {
    expect(await currentInvoicePaymentBlock("sub_1", null)).toBe("PAYMENT_REVIEW_REQUIRED");
    request.mockRejectedValue(new Error("offline"));
    await expect(currentInvoicePaymentBlock("sub_1", "in_1")).rejects.toThrow("offline");
  });
  it("requires review for missing payment allocation despite a confirmed refund", async () => {
    request
      .mockResolvedValueOnce({
        id: "in_1",
        status: "paid",
        amount_paid: 1000,
        parent: { subscription_details: { subscription: "sub_1" } },
      })
      .mockResolvedValueOnce({
        has_more: false,
        data: [
          {
            invoice: "in_1",
            amount_paid: null,
            payment: { type: "payment_intent", payment_intent: "pi_1" },
          },
        ],
      });
    expect(await currentInvoicePaymentBlock("sub_1", "in_1")).toBe("PAYMENT_REVIEW_REQUIRED");
  });
  it("requires review when a positive payment refers to a zero-value charge", async () => {
    request
      .mockResolvedValueOnce({
        id: "in_1",
        status: "paid",
        amount_paid: 1000,
        parent: { subscription_details: { subscription: "sub_1" } },
      })
      .mockResolvedValueOnce({
        has_more: false,
        data: [
          {
            invoice: "in_1",
            amount_paid: 1000,
            payment: { type: "payment_intent", payment_intent: "pi_1" },
          },
        ],
      })
      .mockResolvedValueOnce({ latest_charge: "ch_1" })
      .mockResolvedValueOnce({ id: "ch_1", amount: 0, amount_refunded: 0, disputed: false });
    expect(await currentInvoicePaymentBlock("sub_1", "in_1")).toBe("PAYMENT_REVIEW_REQUIRED");
  });
  it("rejects an invoice from another subscription", async () => {
    await expect(currentInvoicePaymentBlock("sub_other", "in_1")).rejects.toThrow("Vínculo");
  });
  it("does not approve truncated payment lists", async () => {
    request
      .mockResolvedValueOnce({
        id: "in_1",
        status: "paid",
        amount_paid: 1000,
        parent: { subscription_details: { subscription: "sub_1" } },
      })
      .mockResolvedValueOnce({ has_more: true, data: [] });
    expect(await currentInvoicePaymentBlock("sub_1", "in_1")).toBe("PAYMENT_REVIEW_REQUIRED");
  });
  it.each(["charge.refunded", "refund.updated", "charge.dispute.closed"])(
    "resolves %s via canonical links",
    async (type) => {
      expect(await subscriptionsForPaymentEvent(type, "synthetic")).toEqual(["sub_1"]);
      expect(request.mock.calls.every((call) => call.length === 1)).toBe(true);
    },
  );
});
