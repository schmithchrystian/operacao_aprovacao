import type { Metadata } from "next";
import { requireUser } from "@/server/authorization";
import {
  getConfiguredPrice,
  isBillingConfigured,
  planFromRecurring,
} from "@/server/billing/stripe";
import {
  hasSubscriptionAccess,
  latestSubscription,
} from "@/server/repositories/prisma/billing-repository";
import { CheckoutButton, RefreshBillingButton } from "./checkout-button";
export const metadata: Metadata = { title: "Assinatura" };
export default async function SubscriptionPage() {
  const user = await requireUser();
  if (!isBillingConfigured())
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Assinatura</h1>
        <p>A contratação de assinaturas ainda não está disponível.</p>
      </section>
    );
  if (await latestSubscription(user.userId)) {
    const active = await hasSubscriptionAccess(user.userId);
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Assinatura</h1>
        <p>
          {active
            ? "Seu acesso está liberado."
            : "Sua assinatura não está liberando acesso neste momento."}
        </p>
        <p>Consulte pagamentos e opções de alteração ou cancelamento no portal seguro.</p>
        <CheckoutButton portal />
        <RefreshBillingButton />
      </section>
    );
  }
  let price: Awaited<ReturnType<typeof getConfiguredPrice>> | null = null;
  try {
    price = await getConfiguredPrice();
  } catch {
    /* Render a safe unavailable state below. */
  }
  if (!price)
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Assinatura</h1>
        <p role="alert">Não foi possível consultar o plano. Tente novamente em instantes.</p>
      </section>
    );
  const period = { MONTHLY: "mês", QUARTERLY: "trimestre", YEARLY: "ano" }[
    planFromRecurring(price.recurring)
  ];
  const formatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: price.currency.toUpperCase(),
  });
  const amount =
    price.unit_amount === null
      ? null
      : formatter.format(
          price.unit_amount / 10 ** formatter.resolvedOptions().maximumFractionDigits!,
        );
  return (
    <section className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Assinatura</h1>
      <p>{amount ? `${amount} por ${period}` : "Consulte o valor na página de pagamento."}</p>
      <p>
        Confira o valor final e as condições no pagamento seguro. O acesso é liberado após a
        confirmação do provedor; retornar a esta página não confirma a assinatura.
      </p>
      <CheckoutButton />
      <RefreshBillingButton />
    </section>
  );
}
