"use client";

import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
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
import {
  createQuestionInputSchema,
  type AdminQuestionDTO,
  type AdminSubjectDTO,
  type AdminTopicDTO,
} from "@/contracts/admin-content";
import { createQuestionForAdminAction } from "@/server/actions/admin/questions";
import { QuestionOptionsEditor } from "./question-options-editor";

interface CreateQuestionDialogProps {
  subjects: AdminSubjectDTO[];
  topics: AdminTopicDTO[];
  onCreated: (question: AdminQuestionDTO) => void;
}

type CreateQuestionFormValues = z.infer<typeof createQuestionInputSchema>;

const EMPTY_VALUES: CreateQuestionFormValues = {
  statement: "",
  subjectId: "",
  topicId: undefined,
  board: "",
  difficulty: "MEDIUM",
  explanation: "",
  options: [
    { label: "A", text: "", isCorrect: true },
    { label: "B", text: "", isCorrect: false },
  ],
};

/**
 * Diálogo "Criar questão" (Fase 17 — caminho vertical priorizado). Reaproveita
 * `createQuestionInputSchema` direto como resolver do RHF (mesmo raciocínio de
 * `create-course-dialog.tsx`). O editor de alternativas (`QuestionOptionsEditor`) é plugado via
 * `Controller` — totalmente controlado, sem `useFieldArray` (evita atrito de tipos entre os
 * schemas de criar/editar).
 */
export function CreateQuestionDialog({ subjects, topics, onCreated }: CreateQuestionDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateQuestionFormValues>({
    resolver: zodResolver(createQuestionInputSchema),
    defaultValues: EMPTY_VALUES,
  });

  // `useWatch` (não `watch()`) — mesmo padrão de `@/components/simulations/mock-exam-builder-form.tsx`:
  // a função `watch()` de `useForm()` não pode ser memoizada com segurança pelo React Compiler.
  const subjectId = useWatch({ control, name: "subjectId" });
  const filteredTopics = topics.filter((topic) => !subjectId || topic.subjectId === subjectId);
  const optionsError = errors.options?.message;

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      const result = await createQuestionForAdminAction({
        ...values,
        topicId: values.topicId || undefined,
        board: values.board || undefined,
        explanation: values.explanation || undefined,
      });

      if (!result.ok) {
        if (result.error.fieldErrors) {
          for (const [field, messages] of Object.entries(result.error.fieldErrors)) {
            const message = messages[0];
            if (message) setError(field as keyof CreateQuestionFormValues, { message });
          }
        }
        setFormError(result.error.message);
        return;
      }

      toast.success("Questão criada.");
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
        Nova questão
      </DialogTrigger>
      <DialogContent aria-describedby="create-question-description" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova questão</DialogTitle>
          <DialogDescription id="create-question-description">
            Informe o enunciado, ao menos 2 alternativas e marque exatamente uma como correta.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label htmlFor="question-statement">Enunciado</Label>
            <textarea
              id="question-statement"
              rows={4}
              className="border-input bg-transparent dark:bg-input/30 aria-invalid:border-destructive w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none"
              aria-invalid={Boolean(errors.statement)}
              {...register("statement")}
            />
            {errors.statement?.message ? (
              <p role="alert" className="text-destructive text-sm">
                {errors.statement.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="question-subject">Matéria</Label>
              <NativeSelect id="question-subject" aria-invalid={Boolean(errors.subjectId)} {...register("subjectId")}>
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
              <Label htmlFor="question-topic">Assunto (opcional)</Label>
              <NativeSelect id="question-topic" {...register("topicId")}>
                <option value="">Nenhum</option>
                {filteredTopics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="question-difficulty">Dificuldade</Label>
              <NativeSelect id="question-difficulty" {...register("difficulty")}>
                <option value="EASY">Fácil</option>
                <option value="MEDIUM">Média</option>
                <option value="HARD">Difícil</option>
              </NativeSelect>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="question-board">Banca (opcional)</Label>
            <Input id="question-board" {...register("board")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="question-explanation">Explicação (opcional)</Label>
            <textarea
              id="question-explanation"
              rows={2}
              className="border-input bg-transparent dark:bg-input/30 w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none"
              {...register("explanation")}
            />
          </div>

          <Controller
            control={control}
            name="options"
            render={({ field }) => (
              <QuestionOptionsEditor
                idPrefix="create-question"
                value={field.value}
                onChange={field.onChange}
                error={optionsError}
              />
            )}
          />

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
              {isPending ? "Salvando..." : "Criar questão"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
