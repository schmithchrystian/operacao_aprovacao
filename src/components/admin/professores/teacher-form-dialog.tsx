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
import type { AdminTeacherDTO } from "@/contracts/admin-content";
import { createTeacherForAdminAction, updateTeacherForAdminAction } from "@/server/actions/admin/teachers";

interface TeacherFormDialogProps {
  teacher?: AdminTeacherDTO;
  onSaved: (teacher: AdminTeacherDTO) => void;
}

/** Ver comentário equivalente em `@/components/admin/materias/subject-form-dialog.tsx`
 *  (schema local compartilhado entre criar/editar). `avatarUrl` aceita string vazia (campo
 *  opcional deixado em branco) além de uma URL válida. */
const teacherFormSchema = z.object({
  name: z.string().min(1, "Informe o nome.").max(160),
  bio: z.string().max(2000).optional(),
  avatarUrl: z.string().url("Informe uma URL válida.").max(2000).optional().or(z.literal("")),
});
type TeacherFormValues = z.infer<typeof teacherFormSchema>;

/** Diálogo único de criar/editar Professor (Fase 17 — "cadastrar/editar"). */
export function TeacherFormDialog({ teacher, onSaved }: TeacherFormDialogProps) {
  const isEdit = Boolean(teacher);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: { name: teacher?.name ?? "", bio: teacher?.bio ?? "", avatarUrl: teacher?.avatarUrl ?? "" },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      const payload = {
        name: values.name,
        bio: values.bio || undefined,
        avatarUrl: values.avatarUrl || undefined,
      };
      const result = isEdit
        ? await updateTeacherForAdminAction({ id: teacher!.id, ...payload })
        : await createTeacherForAdminAction(payload);

      if (!result.ok) {
        if (result.error.fieldErrors) {
          for (const [field, messages] of Object.entries(result.error.fieldErrors)) {
            const message = messages[0];
            if (message) setError(field as keyof TeacherFormValues, { message });
          }
        }
        setFormError(result.error.message);
        return;
      }

      toast.success(isEdit ? "Professor atualizado." : "Professor criado.");
      if (!isEdit) reset({ name: "", bio: "", avatarUrl: "" });
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
      <DialogTrigger render={isEdit ? <Button type="button" variant="outline" size="sm" /> : <Button type="button" />}>
        {isEdit ? (
          <>
            <Pencil aria-hidden="true" />
            Editar
          </>
        ) : (
          <>
            <Plus aria-hidden="true" />
            Novo professor
          </>
        )}
      </DialogTrigger>
      <DialogContent aria-describedby="teacher-form-description">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar professor" : "Novo professor"}</DialogTitle>
          <DialogDescription id="teacher-form-description">
            Professores podem ser vinculados a módulos e aulas.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`teacher-name-${teacher?.id ?? "new"}`}>Nome</Label>
            <Input id={`teacher-name-${teacher?.id ?? "new"}`} aria-invalid={Boolean(errors.name)} {...register("name")} />
            {errors.name?.message ? (
              <p role="alert" className="text-destructive text-sm">
                {errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`teacher-avatar-${teacher?.id ?? "new"}`}>URL do avatar (opcional)</Label>
            <Input
              id={`teacher-avatar-${teacher?.id ?? "new"}`}
              placeholder="https://..."
              aria-invalid={Boolean(errors.avatarUrl)}
              {...register("avatarUrl")}
            />
            {errors.avatarUrl?.message ? (
              <p role="alert" className="text-destructive text-sm">
                {errors.avatarUrl.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`teacher-bio-${teacher?.id ?? "new"}`}>Bio (opcional)</Label>
            <textarea
              id={`teacher-bio-${teacher?.id ?? "new"}`}
              rows={2}
              className="border-input bg-transparent dark:bg-input/30 w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none"
              {...register("bio")}
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
