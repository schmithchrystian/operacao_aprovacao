"use server";
import {
  createCheckout,
  createBillingPortal,
  reconcileOwnSubscription,
} from "@/server/billing/service";
import { fail, ok, type ActionResult } from "@/contracts/common";
import { isDomainError } from "@/server/errors";
export async function checkoutAction(): Promise<ActionResult<{ url: string }>> {
  try {
    return ok({ url: await createCheckout() });
  } catch (error) {
    return isDomainError(error)
      ? fail(error.code, error.message)
      : fail("INTERNAL_ERROR", "Não foi possível abrir o pagamento. Tente novamente.");
  }
}

export async function billingPortalAction(): Promise<ActionResult<{ url: string }>> {
  try {
    return ok({ url: await createBillingPortal() });
  } catch (error) {
    return isDomainError(error)
      ? fail(error.code, error.message)
      : fail("INTERNAL_ERROR", "Não foi possível abrir a gestão da assinatura. Tente novamente.");
  }
}

export async function reconcileBillingAction(): Promise<ActionResult<{ refreshed: boolean }>> {
  try {
    await reconcileOwnSubscription();
    return ok({ refreshed: true });
  } catch (error) {
    return isDomainError(error)
      ? fail(error.code, error.message)
      : fail("INTERNAL_ERROR", "Não foi possível atualizar a assinatura. Tente novamente.");
  }
}
