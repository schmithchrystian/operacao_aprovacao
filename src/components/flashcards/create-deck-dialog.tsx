"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FolderPlus } from "lucide-react";
import { z } from "zod";
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
import { NativeSelect } from "@/components/ui/native-select";
import type { DeckDTO } from "@/contracts/flashcards";
import type { SubjectOptionDTO } from "@/contracts/simulations";
import { createDeckAction } from "@/server/actions/flashcards";

interface CreateDeckDialogProps {
  subjects: SubjectOptionDTO[];
  onCreated: (deck: DeckDTO) => void;
}

/** Schema client-side cobre só a validação "imediata" (título obrigatório) — os limites de
 *  tamanho reais (`createDeckInputSchema`, `@/contracts/flashcards`) não são duplicados aqui; o
 *  servidor sempre revalida e devolve `fieldErrors`, exibidos abaixo do campo correspondente
 *  (CLAUDE.md §9, nunca confiar só na validação do cliente). */
const formSchema = z.object({
  title: z.string().trim().min(1, "Informe um título."),
  subjectId: z.string(),
});
type FormValues = z.infer<typeof formSchema>;

const EMPTY_VALUES: FormValues = { title: "", subjectId: "" };

/**
 * Dialog "Criar baralho" (Fase 14 — UI do agente `frontend`, item 1 da tarefa). Mesmo padrão de
 * `@/components/brainstorm/create-board-dialog.tsx`, com um select adicional de matéria
 * (opcional — `createDeckInputSchema.subjectId`). Cria sempre um baralho `PERSONAL`
 * (`createDeckAction` nunca cria baralhos de matéria/erros/anotações — ver
 * `@/server/services/flashcards/create-deck.ts`). `subjectId` vazio ("Nenhuma") é convertido para
 * `undefined` no envio — baralho pessoal sem matéria vinculada é um estado válido.
 */
export function CreateDeckDialog({ subjects, onCreated }: CreateDeckDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: EMPTY_VALUES,
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      const result = await createDeckAction({
        title: values.title,
        subjectId: values.subjectId || undefined,
      });

      if (!result.ok) {
        if (result.error.fieldErrors) {
          for (const [field, messages] of Object.entries(result.error.fieldErrors)) {
            const message = messages[0];
            if (message && (field === "title" || field === "subjectId")) {
              setError(field, { message });
            }
          }
        }
        setFormError(result.error.message);
        return;
      }

      toast.success("Baralho criado.");
      reset(EMPTY_VALUES);
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
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        <FolderPlus aria-hidden="true" />
        Criar baralho
      </DialogTrigger>
      <DialogContent aria-describedby="create-deck-dialog-description">
        <DialogHeader>
          <DialogTitle>Novo baralho de flashcards</DialogTitle>
          <DialogDescription id="create-deck-dialog-description">
            Baralhos pessoais ficam disponíveis só para você — adicione cartões a ele depois de criado.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="create-deck-title">Título do baralho</Label>
            <Input
              id="create-deck-title"
              placeholder="Ex.: Revisão final"
              aria-invalid={Boolean(errors.title)}
              {...register("title")}
            />
            {errors.title?.message ? (
              <p role="alert" className="text-destructive text-sm">
                {errors.title.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-deck-subject">Matéria (opcional)</Label>
            <NativeSelect id="create-deck-subject" aria-invalid={Boolean(errors.subjectId)} {...register("subjectId")}>
              <option value="">Nenhuma</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </NativeSelect>
            {errors.subjectId?.message ? (
              <p role="alert" className="text-destructive text-sm">
                {errors.subjectId.message}
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
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
