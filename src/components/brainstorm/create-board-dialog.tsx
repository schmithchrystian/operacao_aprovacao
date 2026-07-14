"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBoardInputSchema, type BrainstormBoardDTO, type CreateBoardInput } from "@/contracts/brainstorm";
import { createBoardAction } from "@/server/actions/brainstorm";

interface CreateBoardDialogProps {
  onCreated: (board: BrainstormBoardDTO) => void;
  triggerVariant?: "default" | "outline";
}

/**
 * Dialog "Novo quadro" (Fase 13 — UI do agente `frontend`). Reusa `createBoardInputSchema`
 * (`@/contracts/brainstorm`) diretamente como schema do formulário — entrada trivial (só
 * `title`), sem necessidade de um schema client-side próprio. `createBoardAction` sempre gera as
 * 5 colunas padrão (CLAUDE.md §20); esta tela não escolhe colunas.
 *
 * O rótulo do gatilho é sempre "Novo quadro" (só a ênfase visual — `triggerVariant` — muda entre
 * o estado vazio e a barra de ferramentas): deliberadamente DIFERENTE do texto do botão de
 * submissão ("Criar quadro") para não ter dois controles com o mesmo nome acessível visíveis ao
 * mesmo tempo quando o dialog abre (confuso para leitor de tela e para consultas de teste/E2E).
 */
export function CreateBoardDialog({ onCreated, triggerVariant = "outline" }: CreateBoardDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateBoardInput>({
    resolver: zodResolver(createBoardInputSchema),
    defaultValues: { title: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      const result = await createBoardAction(values);

      if (!result.ok) {
        setFormError(result.error.message);
        return;
      }

      toast.success("Quadro criado!");
      reset({ title: "" });
      setOpen(false);
      onCreated(result.data);
    });
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setFormError(null);
      }}
    >
      <DialogTrigger render={<Button type="button" variant={triggerVariant} />}>
        <FolderPlus aria-hidden="true" />
        Novo quadro
      </DialogTrigger>
      <DialogContent aria-describedby="create-board-dialog-description">
        <DialogHeader>
          <DialogTitle>Novo quadro de Brainstorm</DialogTitle>
          <DialogDescription id="create-board-dialog-description">
            Um quadro novo já vem com as 5 colunas padrão: Ideias, Estudar, Revisar, Dúvidas e Resolvido.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="create-board-title">Título do quadro</Label>
            <Input
              id="create-board-title"
              placeholder="Ex.: Reta final"
              aria-invalid={Boolean(errors.title)}
              {...register("title")}
            />
            {errors.title?.message ? (
              <p role="alert" className="text-destructive text-sm">
                {errors.title.message}
              </p>
            ) : null}
          </div>

          {formError ? (
            <p role="alert" className="text-destructive text-sm">
              {formError}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Criando..." : "Criar quadro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
