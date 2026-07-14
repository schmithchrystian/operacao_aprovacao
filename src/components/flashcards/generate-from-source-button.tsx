"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/contracts/common";
import type { FlashcardDTO } from "@/contracts/flashcards";

interface GenerateFromSourceButtonProps {
  label: string;
  pendingLabel: string;
  icon: LucideIcon;
  action: () => Promise<ActionResult<FlashcardDTO[]>>;
  /** Constrói a mensagem de sucesso a partir do Nº TOTAL de cartões no baralho de destino após a
   *  chamada — NÃO é "quantos foram criados agora" (`createFromErrorsAction`/
   *  `createFromNotesAction` devolvem o estado ATUAL completo do baralho, cartões antigos +
   *  novos, `docs/FLASHCARDS.md` §7 — chamar de novo sem nada novo para importar devolve a MESMA
   *  contagem). Deixar o chamador escrever o texto evita este componente inventar uma frase
   *  genérica que sugira "N cartões gerados agora" quando isso nem sempre é verdade. */
  describeResult: (totalCardsInDeck: number) => string;
  onGenerated: () => void;
}

/**
 * Botão genérico para as duas importações idempotentes da Fase 14 ("Gerar de erros"/"Gerar de
 * anotações", item 1 da tarefa — `createFromErrorsAction`/`createFromNotesAction`): mesma forma
 * (`() => Promise<ActionResult<FlashcardDTO[]>>`), só ação/rótulo/ícone/mensagem mudam. Chamar de
 * novo nunca duplica cartões (idempotência é do backend) — este botão pode ser clicado quantas
 * vezes o aluno quiser, mesmo sem nada novo para importar.
 */
export function GenerateFromSourceButton({
  label,
  pendingLabel,
  icon: Icon,
  action,
  describeResult,
  onGenerated,
}: GenerateFromSourceButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await action();

      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }

      toast.success(describeResult(result.data.length));
      onGenerated();
    });
  }

  return (
    <Button type="button" variant="outline" onClick={handleClick} disabled={isPending}>
      <Icon aria-hidden="true" />
      {isPending ? pendingLabel : label}
    </Button>
  );
}
