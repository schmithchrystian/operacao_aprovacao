"use client";

import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
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
import {
  updateQuestionInputSchema,
  type AdminQuestionDTO,
  type AdminSubjectDTO,
  type AdminTopicDTO,
} from "@/contracts/admin-content";
import { updateQuestionForAdminAction } from "@/server/actions/admin/questions";
import { QuestionOptionsEditor } from "./question-options-editor";

interface EditQuestionDialogProps {
  question: AdminQuestionDTO;
  subjects: AdminSubjectDTO[];
  topics: AdminTopicDTO[];
  onSaved: (question: AdminQuestionDTO) => void;
}

type UpdateQuestionFormValues = z.infer<typeof updateQuestionInputSchema>;

/** Diálogo "Editar questão" — mesmo padrão de `create-question-dialog.tsx`, com `id`/`status`. */
export function EditQuestionDialog({ question, subjects, topics, onSaved }: EditQuestionDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<UpdateQuestionFormValues>({
    resolver: zodResolver(updateQuestionInputSchema),
    defaultValues: {
      id: question.id,
      statement: question.statement,
      subjectId: question.subjectId,
      topicId: question.topicId ?? undefined,
      board: question.board ?? "",
      difficulty: question.difficulty,
      explanation: question.explanation ?? "",
      status: question.status,
      options: question.options
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((option) => ({ label: option.label, text: option.text, isCorrect: option.isCorrect })),
    },
  });

  // `useWatch` (não `watch()`) — mesmo padrão de `@/components/simulations/mock-exam-builder-form.tsx`.
  const subjectId = useWatch({ control, name: "subjectId" });
  const filteredTopics = topics.filter((topic) => !subjectId || topic.subjectId === subjectId);
  const optionsError = errors.options?.message;

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      const result = await updateQuestionForAdminAction({
        ...values,
        topicId: values.topicId || null,
        board: values.board || null,
        explanation: values.explanation || null,
      });

      if (!result.ok) {
        if (result.error.fieldErrors) {
          for (const [field, messages] of Object.entries(result.error.fieldErrors)) {
            const message = messages[0];
            if (message) setError(field as keyof UpdateQuestionFormValues, { message });
          }
        }
        setFormError(result.error.message);
        return;
      }

      toast.success("Questão atualizada.");
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
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <Pencil aria-hidden="true" />
        Editar
      </DialogTrigger>
      <DialogContent aria-describedby={`edit-question-description-${question.id}`} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar questão</DialogTitle>
          <DialogDescription id={`edit-question-description-${question.id}`}>
            {question.statement.slice(0, 80)}
            {question.statement.length > 80 ? "…" : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label htmlFor={`edit-question-statement-${question.id}`}>Enunciado</Label>
            <textarea
              id={`edit-question-statement-${question.id}`}
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
              <Label htmlFor={`edit-question-subject-${question.id}`}>Matéria</Label>
              <NativeSelect id={`edit-question-subject-${question.id}`} {...register("subjectId")}>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`edit-question-topic-${question.id}`}>Assunto (opcional)</Label>
              <NativeSelect id={`edit-question-topic-${question.id}`} {...register("topicId")}>
                <option value="">Nenhum</option>
                {filteredTopics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`edit-question-difficulty-${question.id}`}>Dificuldade</Label>
              <NativeSelect id={`edit-question-difficulty-${question.id}`} {...register("difficulty")}>
                <option value="EASY">Fácil</option>
                <option value="MEDIUM">Média</option>
                <option value="HARD">Difícil</option>
              </NativeSelect>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`edit-question-board-${question.id}`}>Banca (opcional)</Label>
            <Input id={`edit-question-board-${question.id}`} {...register("board")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`edit-question-explanation-${question.id}`}>Explicação (opcional)</Label>
            <textarea
              id={`edit-question-explanation-${question.id}`}
              rows={2}
              className="border-input bg-transparent dark:bg-input/30 w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none"
              {...register("explanation")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`edit-question-status-${question.id}`}>Status</Label>
            <NativeSelect id={`edit-question-status-${question.id}`} {...register("status")}>
              <option value="DRAFT">Rascunho</option>
              <option value="PUBLISHED">Publicado</option>
              <option value="ARCHIVED">Arquivado</option>
            </NativeSelect>
          </div>

          <Controller
            control={control}
            name="options"
            render={({ field }) => (
              <QuestionOptionsEditor
                idPrefix={`edit-question-${question.id}`}
                value={field.value ?? []}
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
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
