"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  checkoutAction,
  billingPortalAction,
  reconcileBillingAction,
} from "@/server/actions/billing";
export function CheckoutButton({ portal = false }: { portal?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await (portal ? billingPortalAction() : checkoutAction());
            if (result.ok) window.location.assign(result.data.url);
            else setError(result.error.message);
          })
        }
      >
        {pending ? "Abrindo…" : portal ? "Gerenciar assinatura" : "Continuar para pagamento"}
      </Button>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

export function RefreshBillingButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await reconcileBillingAction();
            if (result.ok) router.refresh();
            else setError(result.error.message);
          })
        }
      >
        {pending ? "Atualizando…" : "Atualizar situação do pagamento"}
      </Button>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
