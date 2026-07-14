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
import { NativeSelect } from "@/components/ui/native-select";
import { updateModuleInputSchema, type AdminModuleDTO, type AdminSubjectDTO, type AdminTeacherDTO } from "@/contracts/admin-content";
import { updateModuleForAdminAction } from "@/server/actions/admin/modules";

interface EditModuleDialogProps {
  module: AdminModuleDTO;
  subjects: AdminSubjectDTO[];
  teachers: AdminTeacherDTO[];
  onSaved: (module: AdminModuleDTO) => void;
}

type UpdateModuleFormInput = z.input<typeof updateModuleInputSchema>;

/** Diálogo "Editar módulo" — mesmo padrão de `edit-course-dialog.tsx`. */
export function EditModuleDialog({ module, subjects, teachers, onSaved }: EditModuleDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<UpdateModuleFormInput>({
    resolver: zodResolver(updateModuleInputSchema),
    defaultValues: {
      id: module.id,
      subjectId: module.subjectId,
      slug: module.slug,
      title: module.title,
      description: module.description ?? "",
      teacherId: module.teacherId ?? "",
      status: module.status,
    },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      const result = await updateModuleForAdminAction({ ...values, teacherId: values.teacherId || null });

      if (!result.ok) {
        if (result.error.fieldErrors) {
          for (const [field, messages] of Object.entries(result.error.fieldErrors)) {
            const message = messages[0];
            if (message) setError(field as keyof UpdateModuleFormInput, { message });
          }
        }
        setFormError(result.error.message);
        return;
      }

      toast.success("Módulo atualizado.");
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
      <DialogTrigger render={<Button type="button" variant="outline" size="icon-sm" aria-label="Editar módulo" />}>
        <Pencil aria-hidden="true" />
      </DialogTrigger>
      <DialogContent aria-describedby="edit-module-description">
        <DialogHeader>
          <DialogTitle>Editar módulo</DialogTitle>
          <DialogDescription id="edit-module-description">{module.title}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`edit-module-title-${module.id}`}>Título</Label>
            <Input id={`edit-module-title-${module.id}`} aria-invalid={Boolean(errors.title)} {...register("title")} />
            {errors.title?.message ? (
              <p role="alert" className="text-destructive text-sm">
                {errors.title.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`edit-module-subject-${module.id}`}>Matéria</Label>
              <NativeSelect id={`edit-module-subject-${module.id}`} {...register("subjectId")}>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`edit-module-teacher-${module.id}`}>Professor (opcional)</Label>
              <NativeSelect id={`edit-module-teacher-${module.id}`} {...register("teacherId")}>
                <option value="">Nenhum</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`edit-module-description-${module.id}`}>Descrição (opcional)</Label>
            <textarea
              id={`edit-module-description-${module.id}`}
              rows={2}
              className="border-input bg-transparent dark:bg-input/30 w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none"
              {...register("description")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`edit-module-status-${module.id}`}>Status</Label>
            <NativeSelect id={`edit-module-status-${module.id}`} {...register("status")}>
              <option value="DRAFT">Rascunho</option>
              <option value="PUBLISHED">Publicado</option>
              <option value="ARCHIVED">Arquivado</option>
            </NativeSelect>
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
