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
import { updateLessonInputSchema, type AdminLessonDTO, type AdminTeacherDTO } from "@/contracts/admin-content";
import { updateLessonForAdminAction } from "@/server/actions/admin/lessons";

interface EditLessonDialogProps {
  lesson: AdminLessonDTO;
  existingLessons: AdminLessonDTO[];
  teachers: AdminTeacherDTO[];
  onSaved: (lesson: AdminLessonDTO) => void;
}

type UpdateLessonFormInput = z.input<typeof updateLessonInputSchema>;

/** Diálogo "Editar aula" — não mexe em `videoUrl` (fluxo dedicado em `link-video-dialog.tsx`). */
export function EditLessonDialog({ lesson, existingLessons, teachers, onSaved }: EditLessonDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<UpdateLessonFormInput>({
    resolver: zodResolver(updateLessonInputSchema),
    defaultValues: {
      id: lesson.id,
      title: lesson.title,
      durationMinutes: lesson.durationMinutes,
      requiresLessonId: lesson.requiresLessonId ?? "",
      teacherId: lesson.teacherId ?? "",
      status: lesson.status,
    },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      const result = await updateLessonForAdminAction({
        ...values,
        requiresLessonId: values.requiresLessonId || null,
        teacherId: values.teacherId || null,
      });

      if (!result.ok) {
        if (result.error.fieldErrors) {
          for (const [field, messages] of Object.entries(result.error.fieldErrors)) {
            const message = messages[0];
            if (message) setError(field as keyof UpdateLessonFormInput, { message });
          }
        }
        setFormError(result.error.message);
        return;
      }

      toast.success("Aula atualizada.");
      setOpen(false);
      onSaved(result.data);
    });
  });

  const otherLessons = existingLessons.filter((item) => item.id !== lesson.id);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setFormError(null);
      }}
    >
      <DialogTrigger render={<Button type="button" variant="outline" size="icon-sm" aria-label="Editar aula" />}>
        <Pencil aria-hidden="true" />
      </DialogTrigger>
      <DialogContent aria-describedby="edit-lesson-description">
        <DialogHeader>
          <DialogTitle>Editar aula</DialogTitle>
          <DialogDescription id="edit-lesson-description">{lesson.title}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`edit-lesson-title-${lesson.id}`}>Título</Label>
            <Input id={`edit-lesson-title-${lesson.id}`} aria-invalid={Boolean(errors.title)} {...register("title")} />
            {errors.title?.message ? (
              <p role="alert" className="text-destructive text-sm">
                {errors.title.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`edit-lesson-duration-${lesson.id}`}>Duração (min)</Label>
              <Input
                id={`edit-lesson-duration-${lesson.id}`}
                type="number"
                min={0}
                aria-invalid={Boolean(errors.durationMinutes)}
                {...register("durationMinutes")}
              />
              {errors.durationMinutes?.message ? (
                <p role="alert" className="text-destructive text-sm">
                  {errors.durationMinutes.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`edit-lesson-teacher-${lesson.id}`}>Professor (opcional)</Label>
              <NativeSelect id={`edit-lesson-teacher-${lesson.id}`} {...register("teacherId")}>
                <option value="">Nenhum</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          {otherLessons.length > 0 ? (
            <div className="space-y-1.5">
              <Label htmlFor={`edit-lesson-requires-${lesson.id}`}>Requer aula anterior (opcional)</Label>
              <NativeSelect id={`edit-lesson-requires-${lesson.id}`} {...register("requiresLessonId")}>
                <option value="">Nenhuma</option>
                {otherLessons.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </NativeSelect>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor={`edit-lesson-status-${lesson.id}`}>Status</Label>
            <NativeSelect id={`edit-lesson-status-${lesson.id}`} {...register("status")}>
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
