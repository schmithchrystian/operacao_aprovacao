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
import { createMockExamInputSchema, type AdminMockExamDTO, type AdminQuestionDTO } from "@/contracts/admin-content";
import { createMockExamForAdminAction } from "@/server/actions/admin/mock-exams";

interface CreateMockExamDialogProps {
  questions: AdminQuestionDTO[];
  onCreated: (mockExam: AdminMockExamDTO) => void;
}

type CreateMockExamFormInput = z.input<typeof createMockExamInputSchema>;

/** Diálogo "Criar simulado" (catálogo administrativo — Fase 17, actions já existiam para o
 *  caminho completo; UI mínima de lista+criação, na linha de Concurso/Matéria/Professor). */
export function CreateMockExamDialog({ questions, onCreated }: CreateMockExamDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateMockExamFormInput>({
    resolver: zodResolver(createMockExamInputSchema),
    defaultValues: { title: "", description: "", durationMinutes: 60, questionIds: [] },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      const result = await createMockExamForAdminAction(values);

      if (!result.ok) {
        if (result.error.fieldErrors) {
          for (const [field, messages] of Object.entries(result.error.fieldErrors)) {
            const message = messages[0];
            if (message) setError(field as keyof CreateMockExamFormInput, { message });
          }
        }
        setFormError(result.error.message);
        return;
      }

      toast.success("Simulado criado.");
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
        Novo simulado
      </DialogTrigger>
      <DialogContent aria-describedby="create-mock-exam-description" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo simulado</DialogTitle>
          <DialogDescription id="create-mock-exam-description">
            Selecione as questões que compõem o simulado (Ctrl/Cmd + clique para múltiplas).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="mock-exam-title">Título</Label>
            <Input id="mock-exam-title" aria-invalid={Boolean(errors.title)} {...register("title")} />
            {errors.title?.message ? (
              <p role="alert" className="text-destructive text-sm">
                {errors.title.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mock-exam-duration">Duração (min)</Label>
            <Input
              id="mock-exam-duration"
              type="number"
              min={1}
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
            <Label htmlFor="mock-exam-description">Descrição (opcional)</Label>
            <textarea
              id="mock-exam-description"
              rows={2}
              className="border-input bg-transparent dark:bg-input/30 w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none"
              {...register("description")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mock-exam-questions">Questões</Label>
            <select
              id="mock-exam-questions"
              multiple
              size={6}
              aria-invalid={Boolean(errors.questionIds)}
              className="border-input bg-transparent dark:bg-input/30 aria-invalid:border-destructive w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none"
              {...register("questionIds")}
            >
              {questions.map((question) => (
                <option key={question.id} value={question.id}>
                  {question.statement.slice(0, 70)}
                </option>
              ))}
            </select>
            {errors.questionIds?.message ? (
              <p role="alert" className="text-destructive text-sm">
                {errors.questionIds.message}
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
              {isPending ? "Salvando..." : "Criar simulado"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
