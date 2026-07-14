"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
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
import { updateContestInputSchema, type AdminContestDTO } from "@/contracts/admin-content";
import { updateContestForAdminAction } from "@/server/actions/admin/contests";

interface EditContestDialogProps {
  contest: AdminContestDTO;
  onSaved: (contest: AdminContestDTO) => void;
}

type UpdateContestFormInput = z.infer<typeof updateContestInputSchema>;

/** Diálogo "Editar concurso" — `slug` é imutável. */
export function EditContestDialog({ contest, onSaved }: EditContestDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<UpdateContestFormInput>({
    resolver: zodResolver(updateContestInputSchema),
    defaultValues: {
      id: contest.id,
      name: contest.name,
      organizingBoard: contest.organizingBoard ?? "",
      description: contest.description ?? "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      const result = await updateContestForAdminAction(values);

      if (!result.ok) {
        if (result.error.fieldErrors) {
          for (const [field, messages] of Object.entries(result.error.fieldErrors)) {
            const message = messages[0];
            if (message) setError(field as keyof UpdateContestFormInput, { message });
          }
        }
        setFormError(result.error.message);
        return;
      }

      toast.success("Concurso atualizado.");
      setOpen(false);
      onSaved(result.data);
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
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <Pencil aria-hidden="true" />
        Editar
      </DialogTrigger>
      <DialogContent aria-describedby={`edit-contest-description-${contest.id}`}>
        <DialogHeader>
          <DialogTitle>Editar concurso</DialogTitle>
          <DialogDescription id={`edit-contest-description-${contest.id}`}>{contest.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`edit-contest-name-${contest.id}`}>Nome</Label>
            <Input id={`edit-contest-name-${contest.id}`} aria-invalid={Boolean(errors.name)} {...register("name")} />
            {errors.name?.message ? (
              <p role="alert" className="text-destructive text-sm">
                {errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`edit-contest-board-${contest.id}`}>Banca organizadora (opcional)</Label>
            <Input id={`edit-contest-board-${contest.id}`} {...register("organizingBoard")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`edit-contest-description-field-${contest.id}`}>Descrição (opcional)</Label>
            <textarea
              id={`edit-contest-description-field-${contest.id}`}
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
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
