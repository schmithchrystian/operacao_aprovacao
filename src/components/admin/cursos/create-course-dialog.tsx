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
import { createCourseInputSchema, type AdminContestDTO, type AdminCourseDTO } from "@/contracts/admin-content";
import { createCourseForAdminAction } from "@/server/actions/admin/courses";

interface CreateCourseDialogProps {
  contests: AdminContestDTO[];
  onCreated: (course: AdminCourseDTO) => void;
}

/** Tipo de ENTRADA (o que o `<input>` produz, antes de `z.coerce.number()` converter) — mesmo
 *  padrão de `@/components/simulations/mock-exam-builder-form.tsx` (`z.input`, não `z.infer`),
 *  necessário porque `workloadHours` usa `z.coerce.number()`. */
type CreateCourseFormInput = z.input<typeof createCourseInputSchema>;

const EMPTY_VALUES: CreateCourseFormInput = {
  slug: "",
  title: "",
  description: "",
  contestId: "",
  teacherName: "",
  workloadHours: undefined,
  coverColor: "",
  difficulty: undefined,
};

/**
 * Diálogo "Criar curso" (Fase 17 — item 3 da tarefa). Reaproveita `createCourseInputSchema`
 * (`@/contracts/admin-content`) direto como resolver do RHF — o contrato é Zod puro, sem
 * dependência de servidor, então validar com o MESMO schema usado pela Server Action evita
 * duplicar regras entre cliente e servidor (CLAUDE.md §9). O servidor sempre revalida de novo.
 */
export function CreateCourseDialog({ contests, onCreated }: CreateCourseDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateCourseFormInput>({
    resolver: zodResolver(createCourseInputSchema),
    defaultValues: EMPTY_VALUES,
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      const result = await createCourseForAdminAction(values);

      if (!result.ok) {
        if (result.error.fieldErrors) {
          for (const [field, messages] of Object.entries(result.error.fieldErrors)) {
            const message = messages[0];
            if (message) setError(field as keyof CreateCourseFormInput, { message });
          }
        }
        setFormError(result.error.message);
        return;
      }

      toast.success("Curso criado.");
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
      <DialogTrigger render={<Button type="button" />}>
        <Plus aria-hidden="true" />
        Novo curso
      </DialogTrigger>
      <DialogContent aria-describedby="create-course-description" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo curso</DialogTitle>
          <DialogDescription id="create-course-description">
            Cursos começam como rascunho — publique quando o conteúdo estiver pronto.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="course-title">Título</Label>
              <Input id="course-title" aria-invalid={Boolean(errors.title)} {...register("title")} />
              {errors.title?.message ? (
                <p role="alert" className="text-destructive text-sm">
                  {errors.title.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="course-slug">Slug</Label>
              <Input
                id="course-slug"
                placeholder="ex.: policia-federal-2026"
                aria-invalid={Boolean(errors.slug)}
                {...register("slug")}
              />
              {errors.slug?.message ? (
                <p role="alert" className="text-destructive text-sm">
                  {errors.slug.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="course-description">Descrição</Label>
            <textarea
              id="course-description"
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
              <Label htmlFor="course-contest">Concurso</Label>
              <NativeSelect id="course-contest" aria-invalid={Boolean(errors.contestId)} {...register("contestId")}>
                <option value="">Selecione...</option>
                {contests.map((contest) => (
                  <option key={contest.id} value={contest.id}>
                    {contest.name}
                  </option>
                ))}
              </NativeSelect>
              {errors.contestId?.message ? (
                <p role="alert" className="text-destructive text-sm">
                  {errors.contestId.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="course-difficulty">Dificuldade</Label>
              <NativeSelect id="course-difficulty" {...register("difficulty")}>
                <option value="">Não informar</option>
                <option value="iniciante">Iniciante</option>
                <option value="intermediario">Intermediário</option>
                <option value="avancado">Avançado</option>
              </NativeSelect>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="course-teacher">Professor (nome)</Label>
              <Input id="course-teacher" {...register("teacherName")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="course-workload">Carga horária (h)</Label>
              <Input
                id="course-workload"
                type="number"
                min={0}
                aria-invalid={Boolean(errors.workloadHours)}
                {...register("workloadHours")}
              />
              {errors.workloadHours?.message ? (
                <p role="alert" className="text-destructive text-sm">
                  {errors.workloadHours.message}
                </p>
              ) : null}
            </div>
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
              {isPending ? "Salvando..." : "Criar curso"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
