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
import { createModuleInputSchema, type AdminModuleDTO, type AdminSubjectDTO, type AdminTeacherDTO } from "@/contracts/admin-content";
import { createModuleForAdminAction } from "@/server/actions/admin/modules";

interface CreateModuleDialogProps {
  courseId: string;
  subjects: AdminSubjectDTO[];
  teachers: AdminTeacherDTO[];
  onCreated: (module: AdminModuleDTO) => void;
}

type CreateModuleFormInput = z.input<typeof createModuleInputSchema>;

/** Diálogo "Novo módulo" (Fase 17 — Curso → Módulo). Mesmo padrão de `create-course-dialog.tsx`. */
export function CreateModuleDialog({ courseId, subjects, teachers, onCreated }: CreateModuleDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateModuleFormInput>({
    resolver: zodResolver(createModuleInputSchema),
    defaultValues: { courseId, subjectId: "", slug: "", title: "", description: "", teacherId: "", order: undefined },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      const result = await createModuleForAdminAction({ ...values, teacherId: values.teacherId || undefined });

      if (!result.ok) {
        if (result.error.fieldErrors) {
          for (const [field, messages] of Object.entries(result.error.fieldErrors)) {
            const message = messages[0];
            if (message) setError(field as keyof CreateModuleFormInput, { message });
          }
        }
        setFormError(result.error.message);
        return;
      }

      toast.success("Módulo criado.");
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
      <DialogTrigger render={<Button type="button" size="sm" />}>
        <Plus aria-hidden="true" />
        Novo módulo
      </DialogTrigger>
      <DialogContent aria-describedby="create-module-description">
        <DialogHeader>
          <DialogTitle>Novo módulo</DialogTitle>
          <DialogDescription id="create-module-description">
            O módulo entra ao final da lista do curso (ou na posição informada em &ldquo;Ordem&rdquo;).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="module-title">Título</Label>
            <Input id="module-title" aria-invalid={Boolean(errors.title)} {...register("title")} />
            {errors.title?.message ? (
              <p role="alert" className="text-destructive text-sm">
                {errors.title.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="module-slug">Slug</Label>
            <Input id="module-slug" aria-invalid={Boolean(errors.slug)} {...register("slug")} />
            {errors.slug?.message ? (
              <p role="alert" className="text-destructive text-sm">
                {errors.slug.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="module-subject">Matéria</Label>
              <NativeSelect id="module-subject" aria-invalid={Boolean(errors.subjectId)} {...register("subjectId")}>
                <option value="">Selecione...</option>
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
            <div className="space-y-1.5">
              <Label htmlFor="module-teacher">Professor (opcional)</Label>
              <NativeSelect id="module-teacher" {...register("teacherId")}>
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
            <Label htmlFor="module-description">Descrição (opcional)</Label>
            <textarea
              id="module-description"
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
              {isPending ? "Salvando..." : "Criar módulo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
