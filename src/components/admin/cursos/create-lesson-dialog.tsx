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
import { NativeSelect } from "@/components/ui/native-select";
import { createLessonInputSchema, type AdminLessonDTO, type AdminTeacherDTO } from "@/contracts/admin-content";
import { createLessonForAdminAction } from "@/server/actions/admin/lessons";

interface CreateLessonDialogProps {
  moduleId: string;
  existingLessons: AdminLessonDTO[];
  teachers: AdminTeacherDTO[];
  onCreated: (lesson: AdminLessonDTO) => void;
}

type CreateLessonFormInput = z.input<typeof createLessonInputSchema>;

/** Diálogo "Nova aula" (Fase 17 — Módulo → Aula). `videoUrl` já pode ser informado aqui, mas o
 *  fluxo dedicado de "vincular vídeo" (item explícito da tarefa) vive em `link-video-dialog.tsx`. */
export function CreateLessonDialog({ moduleId, existingLessons, teachers, onCreated }: CreateLessonDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateLessonFormInput>({
    resolver: zodResolver(createLessonInputSchema),
    defaultValues: {
      moduleId,
      title: "",
      durationMinutes: 0,
      requiresLessonId: "",
      videoUrl: "",
      teacherId: "",
      order: undefined,
    },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      const result = await createLessonForAdminAction({
        ...values,
        requiresLessonId: values.requiresLessonId || undefined,
        videoUrl: values.videoUrl || undefined,
        teacherId: values.teacherId || undefined,
      });

      if (!result.ok) {
        if (result.error.fieldErrors) {
          for (const [field, messages] of Object.entries(result.error.fieldErrors)) {
            const message = messages[0];
            if (message) setError(field as keyof CreateLessonFormInput, { message });
          }
        }
        setFormError(result.error.message);
        return;
      }

      toast.success("Aula criada.");
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
      <DialogTrigger render={<Button type="button" size="sm" variant="outline" />}>
        <Plus aria-hidden="true" />
        Nova aula
      </DialogTrigger>
      <DialogContent aria-describedby="create-lesson-description">
        <DialogHeader>
          <DialogTitle>Nova aula</DialogTitle>
          <DialogDescription id="create-lesson-description">
            O vídeo pode ser vinculado agora ou depois, pela ação &ldquo;Vincular vídeo&rdquo;.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="lesson-title">Título</Label>
            <Input id="lesson-title" aria-invalid={Boolean(errors.title)} {...register("title")} />
            {errors.title?.message ? (
              <p role="alert" className="text-destructive text-sm">
                {errors.title.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="lesson-duration">Duração (min)</Label>
              <Input
                id="lesson-duration"
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
              <Label htmlFor="lesson-teacher">Professor (opcional)</Label>
              <NativeSelect id="lesson-teacher" {...register("teacherId")}>
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
            <Label htmlFor="lesson-video">URL do vídeo (opcional)</Label>
            <Input id="lesson-video" placeholder="https://..." aria-invalid={Boolean(errors.videoUrl)} {...register("videoUrl")} />
            {errors.videoUrl?.message ? (
              <p role="alert" className="text-destructive text-sm">
                {errors.videoUrl.message}
              </p>
            ) : null}
          </div>

          {existingLessons.length > 0 ? (
            <div className="space-y-1.5">
              <Label htmlFor="lesson-requires">Requer aula anterior (opcional)</Label>
              <NativeSelect id="lesson-requires" {...register("requiresLessonId")}>
                <option value="">Nenhuma</option>
                {existingLessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.title}
                  </option>
                ))}
              </NativeSelect>
            </div>
          ) : null}

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
              {isPending ? "Salvando..." : "Criar aula"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
