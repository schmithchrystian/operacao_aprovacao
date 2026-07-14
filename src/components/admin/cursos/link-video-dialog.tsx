"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Video } from "lucide-react";
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
import { linkLessonVideoInputSchema, type AdminLessonDTO } from "@/contracts/admin-content";
import { linkLessonVideoForAdminAction } from "@/server/actions/admin/lessons";

interface LinkVideoDialogProps {
  lesson: AdminLessonDTO;
  onSaved: (lesson: AdminLessonDTO) => void;
}

type LinkVideoFormInput = z.input<typeof linkLessonVideoInputSchema>;

/**
 * Diálogo dedicado "Vincular vídeo" (Fase 17 — item explícito do escopo: "vincular vídeo = setar
 * URL"). Ação própria (`linkLessonVideoForAdminAction`), separada da edição geral da aula —
 * mesma distinção feita no contrato (`@/contracts/admin-content` — comentário de
 * `linkLessonVideoInputSchema`). Um campo vazio desvincula o vídeo (`videoUrl: null`).
 */
export function LinkVideoDialog({ lesson, onSaved }: LinkVideoDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LinkVideoFormInput>({
    resolver: zodResolver(linkLessonVideoInputSchema),
    defaultValues: { id: lesson.id, videoUrl: lesson.videoUrl ?? "" },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      const result = await linkLessonVideoForAdminAction({ id: values.id, videoUrl: values.videoUrl || null });

      if (!result.ok) {
        if (result.error.fieldErrors) {
          for (const [field, messages] of Object.entries(result.error.fieldErrors)) {
            const message = messages[0];
            if (message) setError(field as keyof LinkVideoFormInput, { message });
          }
        }
        setFormError(result.error.message);
        return;
      }

      toast.success(result.data.videoUrl ? "Vídeo vinculado." : "Vídeo desvinculado.");
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
      <DialogTrigger
        render={
          <Button
            type="button"
            variant={lesson.videoUrl ? "outline" : "secondary"}
            size="icon-sm"
            aria-label="Vincular vídeo"
          />
        }
      >
        <Video aria-hidden="true" />
      </DialogTrigger>
      <DialogContent aria-describedby="link-video-description">
        <DialogHeader>
          <DialogTitle>Vincular vídeo</DialogTitle>
          <DialogDescription id="link-video-description">
            {lesson.title} — deixe em branco para desvincular o vídeo atual.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`link-video-url-${lesson.id}`}>URL do vídeo</Label>
            <Input
              id={`link-video-url-${lesson.id}`}
              placeholder="https://..."
              aria-invalid={Boolean(errors.videoUrl)}
              {...register("videoUrl")}
            />
            {errors.videoUrl?.message ? (
              <p role="alert" className="text-destructive text-sm">
                {errors.videoUrl.message}
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
