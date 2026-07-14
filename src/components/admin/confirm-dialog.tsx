"use client";

import { useState, useTransition, type ReactElement, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  /** Elemento "molde" do gatilho (ex.: `<Button variant="destructive" size="sm" />`, sem
   *  `children`) — mesmo padrão `render` de `DialogTrigger` usado no resto do projeto
   *  (`@/components/flashcards/create-deck-dialog.tsx` e afins). */
  render: ReactElement;
  /** Conteúdo visível do gatilho (ícone + rótulo). */
  children: ReactNode;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Estilo do botão de confirmação — `true` para operações destrutivas (arquivar/excluir). */
  destructive?: boolean;
  /**
   * Executa a operação (chama a Server Action). Deve retornar `true` em caso de sucesso
   * (fecha o diálogo) — o próprio chamador cuida do toast de sucesso/erro, pois cada ação tem
   * sua própria mensagem. Retornar `false` mantém o diálogo aberto (ex.: erro já exibido).
   */
  onConfirm: () => Promise<boolean>;
}

/**
 * Diálogo de confirmação genérico — CLAUDE.md/Fase 17 (item 3/4): toda operação destrutiva
 * (arquivar/excluir) e toda alteração sensível (papel de usuário, ativar/desativar, moderação)
 * exige uma confirmação explícita, nunca inferida de um único clique. Reutilizado por todas as
 * telas administrativas em vez de duplicar o mesmo `useState`/`useTransition` em cada uma.
 */
export function ConfirmDialog({
  render,
  children,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      const success = await onConfirm();
      if (success) setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && setOpen(next)}>
      <DialogTrigger render={render}>{children}</DialogTrigger>
      <DialogContent aria-describedby={description ? "confirm-dialog-description" : undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription id="confirm-dialog-description">{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? "Processando..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Helper compartilhado: dispara toast de erro a partir de um `ActionResult` com `ok: false`. */
export function toastActionError(message: string): void {
  toast.error(message);
}
