"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { z } from "zod";
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
import { createContestInputSchema, type AdminContestDTO } from "@/contracts/admin-content";
import { createContestForAdminAction } from "@/server/actions/admin/contests";

interface CreateContestDialogProps {
  onCreated: (contest: AdminContestDTO) => void;
}

type CreateContestFormInput = z.infer<typeof createContestInputSchema>;

/** Diálogo "Criar concurso" (Fase 17 — item "ao menos listar + criar"). */
export function CreateContestDialog({ onCreated }: CreateContestDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateContestFormInput>({
    resolver: zodResolver(createContestInputSchema),
    defaultValues: { slug: "", name: "", organizingBoard: "", description: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      const result = await createContestForAdminAction(values);

      if (!result.ok) {
        if (result.error.fieldErrors) {
          for (const [field, messages] of Object.entries(result.error.fieldErrors)) {
            const message = messages[0];
            if (message) setError(field as keyof CreateContestFormInput, { message });
          }
        }
        setFormError(result.error.message);
        return;
      }

      toast.success("Concurso criado.");
      reset();
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
      <DialogTrigger render={<Button type="button" />}>
        <Plus aria-hidden="true" />
        Novo concurso
      </DialogTrigger>
      <DialogContent aria-describedby="create-contest-description">
        <DialogHeader>
          <DialogTitle>Novo concurso</DialogTitle>
          <DialogDescription id="create-contest-description">
            Cadastro básico do concurso — cursos são vinculados a ele depois.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="contest-name">Nome</Label>
              <Input id="contest-name" aria-invalid={Boolean(errors.name)} {...register("name")} />
              {errors.name?.message ? (
                <p role="alert" className="text-destructive text-sm">
                  {errors.name.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contest-slug">Slug</Label>
              <Input id="contest-slug" aria-invalid={Boolean(errors.slug)} {...register("slug")} />
              {errors.slug?.message ? (
                <p role="alert" className="text-destructive text-sm">
                  {errors.slug.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contest-board">Banca organizadora (opcional)</Label>
            <Input id="contest-board" {...register("organizingBoard")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contest-description">Descrição (opcional)</Label>
            <textarea
              id="contest-description"
              rows={2}
              className="border-input bg-transparent dark:bg-input/30 w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none"
              {...register("description")}
            />
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
              {isPending ? "Salvando..." : "Criar concurso"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
