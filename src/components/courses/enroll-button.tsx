"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { enrollAction } from "@/server/actions/courses";

interface EnrollButtonProps {
  courseId: string;
}

/**
 * Botão de matrícula (Client Component — mesmo padrão de `LoginForm`: `useTransition` +
 * `sonner` para feedback + `router.refresh()` para reidratar a página com `enrolled: true`).
 * `enrollAction` já resolve o usuário pela sessão real e é idempotente — nenhum cálculo de
 * matrícula/progresso acontece aqui.
 */
export function EnrollButton({ courseId }: EnrollButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleEnroll() {
    startTransition(async () => {
      const result = await enrollAction({ courseId });

      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }

      toast.success("Matrícula realizada com sucesso.");
      router.refresh();
    });
  }

  return (
    <Button type="button" onClick={handleEnroll} disabled={isPending}>
      {isPending ? "Matriculando..." : "Matricular"}
    </Button>
  );
}
