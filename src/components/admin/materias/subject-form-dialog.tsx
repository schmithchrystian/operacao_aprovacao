"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
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
import type { AdminSubjectDTO } from "@/contracts/admin-content";
import { createSubjectForAdminAction, updateSubjectForAdminAction } from "@/server/actions/admin/subjects";

interface SubjectFormDialogProps {
  subject?: AdminSubjectDTO;
  onSaved: (subject: AdminSubjectDTO) => void;
}

/** Schema local (mesmo limite de `createSubjectInputSchema`/`updateSubjectInputSchema` —
 *  `@/contracts/admin-content`), usado tanto para criar quanto para editar: os dois contratos
 *  reais têm formatos diferentes o suficiente (campos opcionais na edição) para um resolver
 *  único do RHF não tipar bem via ternário; o servidor sempre revalida com o schema real. */
const subjectFormSchema = z.object({ name: z.string().min(1, "Informe o nome.").max(160) });

/**
 * Diálogo único de criar/editar Matéria (Fase 17 — "cadastrar/editar"). Formulário mínimo (só
 * `name`) — ao contrário de Curso/Módulo/Aula/Questão/Conquista, aqui não vale a pena duplicar
 * dois componentes quase idênticos só por causa do modo.
 */
export function SubjectFormDialog({ subject, onSaved }: SubjectFormDialogProps) {
  const isEdit = Boolean(subject);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<z.infer<typeof subjectFormSchema>>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: { name: subject?.name ?? "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    startTransition(async () => {
      const result = isEdit
        ? await updateSubjectForAdminAction({ id: subject!.id, name: values.name })
        : await createSubjectForAdminAction(values);

      if (!result.ok) {
        if (result.error.fieldErrors) {
          for (const [field, messages] of Object.entries(result.error.fieldErrors)) {
            const message = messages[0];
            if (message && field === "name") setError("name", { message });
          }
        }
        setFormError(result.error.message);
        return;
      }

      toast.success(isEdit ? "Matéria atualizada." : "Matéria criada.");
      if (!isEdit) reset({ name: "" });
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
      <DialogTrigger
        render={
          isEdit ? (
            <Button type="button" variant="outline" size="sm" />
          ) : (
            <Button type="button" />
          )
        }
      >
        {isEdit ? (
          <>
            <Pencil aria-hidden="true" />
            Editar
          </>
        ) : (
          <>
            <Plus aria-hidden="true" />
            Nova matéria
          </>
        )}
      </DialogTrigger>
      <DialogContent aria-describedby="subject-form-description">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar matéria" : "Nova matéria"}</DialogTitle>
          <DialogDescription id="subject-form-description">
            Matérias organizam módulos e questões (ex.: Direito Constitucional).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`subject-name-${subject?.id ?? "new"}`}>Nome</Label>
            <Input id={`subject-name-${subject?.id ?? "new"}`} aria-invalid={Boolean(errors.name)} {...register("name")} />
            {errors.name?.message ? (
              <p role="alert" className="text-destructive text-sm">
                {errors.name.message}
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
