"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAttemptAction } from "@/server/actions/simulations";

interface StartCatalogExamButtonProps {
  mockExamId: string;
}

/**
 * Inicia uma tentativa a partir de um simulado PRONTO do catálogo (Client Component — mesmo
 * padrão de `EnrollButton`/`LoginForm`: `useTransition` + `sonner`). `createAttemptAction` só
 * precisa do `mockExamId`; `startedAt`/`status`/tempo restante são sempre resolvidos pelo
 * servidor (`AttemptDTO` nunca contém gabarito).
 */
export function StartCatalogExamButton({ mockExamId }: StartCatalogExamButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleStart() {
    startTransition(async () => {
      const result = await createAttemptAction({ mockExamId });

      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }

      router.push(`/simulados/${result.data.id}`);
    });
  }

  return (
    <Button type="button" onClick={handleStart} disabled={isPending} className="w-full sm:w-auto">
      <Play aria-hidden="true" />
      {isPending ? "Iniciando..." : "Iniciar simulado"}
    </Button>
  );
}
