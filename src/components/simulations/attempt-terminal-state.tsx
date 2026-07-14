import Link from "next/link";
import { Ban, Clock, History, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatDatePtBr } from "@/lib/utils";
import type { AttemptStatusDTO } from "@/contracts/simulations";

interface AttemptTerminalStateProps {
  attempt: AttemptStatusDTO;
}

/**
 * Estado TERMINAL de uma tentativa (Fase 10 — UI). Renderizado quando a tentativa está
 * `EXPIRED` ou `CANCELLED`: nem a tela de resolução (`IN_PROGRESS`) nem a de resultado
 * (`FINISHED`) se aplicam, e — crucialmente — NENHUMA das duas deve redirecionar para a outra
 * (era o loop de redirect corrigido no achado de segurança Fase 10 — MÉDIO). Mostra só um
 * resumo não sensível (título, início, nº de questões) — SEM gabarito/nota, que não existem
 * para uma tentativa que nunca foi corrigida — e leva o aluno a montar um novo simulado ou ver
 * o histórico. Server Component, puramente apresentacional.
 */
const TERMINAL_COPY: Record<"EXPIRED" | "CANCELLED", { title: string; description: string }> = {
  EXPIRED: {
    title: "Tempo esgotado",
    description:
      "O tempo desta tentativa foi esgotado antes do envio, então ela foi encerrada automaticamente. As respostas não chegaram a ser corrigidas — inicie um novo simulado para treinar de novo.",
  },
  CANCELLED: {
    title: "Tentativa cancelada",
    description:
      "Esta tentativa foi cancelada e não será corrigida. Você pode montar um novo simulado quando quiser.",
  },
};

export function AttemptTerminalState({ attempt }: AttemptTerminalStateProps) {
  const isExpired = attempt.status === "EXPIRED";
  const copy = isExpired ? TERMINAL_COPY.EXPIRED : TERMINAL_COPY.CANCELLED;
  const Icon = isExpired ? Clock : Ban;

  return (
    <Card
      role="status"
      className={
        isExpired ? "border-destructive/30 bg-destructive/5" : "border-border bg-card/40"
      }
    >
      <CardContent className="flex flex-col items-center gap-4 px-6 py-12 text-center">
        <span
          className={
            isExpired
              ? "bg-destructive/10 text-destructive flex h-12 w-12 items-center justify-center rounded-full"
              : "bg-muted text-muted-foreground flex h-12 w-12 items-center justify-center rounded-full"
          }
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>

        <div className="space-y-1">
          <p className="text-foreground text-lg font-semibold">{copy.title}</p>
          <p className="text-muted-foreground max-w-md text-sm">{copy.description}</p>
        </div>

        <div className="text-muted-foreground text-xs">
          {attempt.mockExamTitle ?? "Simulado personalizado"} · {attempt.totalQuestions} questões · iniciado em{" "}
          {formatDatePtBr(attempt.startedAt)}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link href="/simulados" className={cn(buttonVariants())}>
            <Plus aria-hidden="true" />
            Montar novo simulado
          </Link>
          <Link href="/simulados/historico" className={cn(buttonVariants({ variant: "outline" }))}>
            <History aria-hidden="true" />
            Ver histórico
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
