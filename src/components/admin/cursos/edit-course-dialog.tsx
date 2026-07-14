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
import { updateCourseInputSchema, type AdminContestDTO, type AdminCourseDTO } from "@/contracts/admin-content";
import { updateCourseForAdminAction } from "@/server/actions/admin/courses";

interface EditCourseDialogProps {
  course: AdminCourseDTO;
  contests: AdminContestDTO[];
  onSaved: (course: AdminCourseDTO) => void;
}

/** Ver comentário equivalente em `create-course-dialog.tsx` (`z.input` por causa de `z.coerce.number()`). */
type UpdateCourseFormInput = z.input<typeof updateCourseInputSchema>;

/** Diálogo "Editar curso" — mesmo padrão de `create-course-dialog.tsx`, mas sem `slug`
 *  (imutável após a criação, `updateCourseInputSchema` não expõe esse campo) e com `status`. */
export function EditCourseDialog({ course, contests, onSaved }: EditCourseDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<UpdateCourseFormInput>({
    resolver: zodResolver(updateCourseInputSchema),
    defaultValues: {
      id: course.id,
      title: course.title,
      description: course.description,
      contestId: course.contestId,
      teacherName: course.teacherName,
      workloadHours: course.workloadHours,
      coverColor: course.coverColor,
      difficulty: course.difficulty,
      status: course.status,
    },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      const result = await updateCourseForAdminAction(values);

      if (!result.ok) {
        if (result.error.fieldErrors) {
          for (const [field, messages] of Object.entries(result.error.fieldErrors)) {
            const message = messages[0];
            if (message) setError(field as keyof UpdateCourseFormInput, { message });
          }
        }
        setFormError(result.error.message);
        return;
      }

      toast.success("Curso atualizado.");
      setOpen(false);
      onSaved(result.data);
    });
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setFormError(null);
          reset();
        }
      }}
    >
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <Pencil aria-hidden="true" />
        Editar
      </DialogTrigger>
      <DialogContent aria-describedby="edit-course-description" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar curso</DialogTitle>
          <DialogDescription id="edit-course-description">{course.title}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`edit-course-title-${course.id}`}>Título</Label>
            <Input
              id={`edit-course-title-${course.id}`}
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
            <Label htmlFor={`edit-course-description-${course.id}`}>Descrição</Label>
            <textarea
              id={`edit-course-description-${course.id}`}
              rows={3}
              className="border-input bg-transparent dark:bg-input/30 aria-invalid:border-destructive w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none"
              aria-invalid={Boolean(errors.description)}
              {...register("description")}
            />
            {errors.description?.message ? (
              <p role="alert" className="text-destructive text-sm">
                {errors.description.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`edit-course-contest-${course.id}`}>Concurso</Label>
              <NativeSelect id={`edit-course-contest-${course.id}`} {...register("contestId")}>
                {contests.map((contest) => (
                  <option key={contest.id} value={contest.id}>
                    {contest.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`edit-course-difficulty-${course.id}`}>Dificuldade</Label>
              <NativeSelect id={`edit-course-difficulty-${course.id}`} {...register("difficulty")}>
                <option value="iniciante">Iniciante</option>
                <option value="intermediario">Intermediário</option>
                <option value="avancado">Avançado</option>
              </NativeSelect>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`edit-course-teacher-${course.id}`}>Professor (nome)</Label>
              <Input id={`edit-course-teacher-${course.id}`} {...register("teacherName")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`edit-course-workload-${course.id}`}>Carga horária (h)</Label>
              <Input
                id={`edit-course-workload-${course.id}`}
                type="number"
                min={0}
                {...register("workloadHours")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`edit-course-status-${course.id}`}>Status</Label>
            <NativeSelect id={`edit-course-status-${course.id}`} {...register("status")}>
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
