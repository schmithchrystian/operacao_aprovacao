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
import { NativeSelect } from "@/components/ui/native-select";
import type { AdminSubjectDTO, AdminTopicDTO } from "@/contracts/admin-content";
import { createTopicForAdminAction, updateTopicForAdminAction } from "@/server/actions/admin/topics";

interface TopicFormDialogProps {
  topic?: AdminTopicDTO;
  subjects: AdminSubjectDTO[];
  onSaved: (topic: AdminTopicDTO) => void;
}

/** Ver comentário equivalente em `@/components/admin/materias/subject-form-dialog.tsx`
 *  (schema local compartilhado entre criar/editar, mesmos limites do contrato real). */
const topicFormSchema = z.object({
  subjectId: z.string().min(1, "Selecione a matéria."),
  name: z.string().min(1, "Informe o nome.").max(160),
});
type TopicFormValues = z.infer<typeof topicFormSchema>;

/** Diálogo único de criar/editar Assunto (Fase 17 — "cadastrar/editar"), mesmo padrão de
 *  `@/components/admin/materias/subject-form-dialog.tsx`. */
export function TopicFormDialog({ topic, subjects, onSaved }: TopicFormDialogProps) {
  const isEdit = Boolean(topic);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<TopicFormValues>({
    resolver: zodResolver(topicFormSchema),
    defaultValues: { subjectId: topic?.subjectId ?? "", name: topic?.name ?? "" },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      const result = isEdit
        ? await updateTopicForAdminAction({ id: topic!.id, ...values })
        : await createTopicForAdminAction(values);

      if (!result.ok) {
        if (result.error.fieldErrors) {
          for (const [field, messages] of Object.entries(result.error.fieldErrors)) {
            const message = messages[0];
            if (message) setError(field as keyof TopicFormValues, { message });
          }
        }
        setFormError(result.error.message);
        return;
      }

      toast.success(isEdit ? "Assunto atualizado." : "Assunto criado.");
      if (!isEdit) reset({ subjectId: "", name: "" });
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
            Novo assunto
          </>
        )}
      </DialogTrigger>
      <DialogContent aria-describedby="topic-form-description">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar assunto" : "Novo assunto"}</DialogTitle>
          <DialogDescription id="topic-form-description">
            Assuntos detalham uma matéria (ex.: &ldquo;Controle de constitucionalidade&rdquo; em Direito Constitucional).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`topic-subject-${topic?.id ?? "new"}`}>Matéria</Label>
            <NativeSelect id={`topic-subject-${topic?.id ?? "new"}`} aria-invalid={Boolean(errors.subjectId)} {...register("subjectId")}>
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
            <Label htmlFor={`topic-name-${topic?.id ?? "new"}`}>Nome</Label>
            <Input id={`topic-name-${topic?.id ?? "new"}`} aria-invalid={Boolean(errors.name)} {...register("name")} />
            {errors.name?.message ? (
              <p role="alert" className="text-destructive text-sm">
                {errors.name.message}
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
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
