"use client";

import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, XCircle } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FOCUS } from "@/config/business";
import type { FinishFocusResultDTO } from "@/contracts/focus";
import { finishFocusSessionAction } from "@/server/actions/focus";
import { FOCUS_LEVEL_LABEL, FOCUS_LEVEL_OPTIONS, isFocusLevel } from "./labels";

interface FocusFinishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  objective: string | null;
  onFinished: (result: FinishFocusResultDTO) => void;
  /** A sessão não está mais em condições de ser finalizada por este caminho (ex.: já finalizada
   *  em outra aba) — mesmo tratamento do `CONFLICT` em `@/components/simulations/attempt-runner.tsx`. */
  onConflict: (message: string) => void;
}

const formSchema = z.object({
  goalAchieved: z.union([z.literal("yes"), z.literal("no"), z.literal("")]),
  contentStudied: z.string().max(FOCUS.contentStudiedMaxLength, "Conteúdo muito longo."),
  focusLevel: z.union([z.literal(""), z.number().int().min(1).max(5)]),
  doubtNote: z.string().max(FOCUS.doubtNoteMaxLength, "Anotação muito longa."),
});
type FormValues = z.infer<typeof formSchema>;

const DEFAULT_VALUES: FormValues = {
  goalAchieved: "",
  contentStudied: "",
  focusLevel: "",
  doubtNote: "",
};

const SERVER_TO_CLIENT_FIELD: Record<string, keyof FormValues> = {
  goalAchieved: "goalAchieved",
  contentStudied: "contentStudied",
  focusLevel: "focusLevel",
  doubtNote: "doubtNote",
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-destructive text-sm">
      {message}
    </p>
  );
}

const TEXTAREA_CLASS =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 min-h-20 w-full resize-y rounded-lg border px-2.5 py-2 text-sm outline-none focus-visible:ring-3 aria-invalid:ring-3";

/**
 * Autoavaliação de encerramento do Modo Foco (Fase 15 — UI, item 4 da tarefa). TODOS os campos
 * são informativos (`FinishFocusInput`, `@/contracts/focus`) — nenhum decide a pontuação; quem
 * decide é sempre `finishFocusSessionAction` -> `finishFocusSession` no servidor, a partir do
 * histórico de heartbeats desta sessão. Este dialog só recolhe a autoavaliação e devolve o
 * `FinishFocusResultDTO` exatamente como o servidor respondeu (`onFinished`), para
 * `FocusSessionResult` exibir sem recalcular nada.
 */
export function FocusFinishDialog({
  open,
  onOpenChange,
  sessionId,
  objective,
  onFinished,
  onConflict,
}: FocusFinishDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULT_VALUES,
  });

  // `useWatch` (não `form.watch()`) — mesmo padrão de `StudySessionBuilderForm`/`CardFormDialog`:
  // `watch()` devolve uma função que não pode ser memoizada com segurança (React Compiler).
  const goalAchieved = useWatch({ control, name: "goalAchieved" });
  const focusLevel = useWatch({ control, name: "focusLevel" });

  // Reseta ao FECHAR (não num efeito reagindo à abertura — `setState` síncrono dentro de efeito
  // causa renders em cascata, `react-hooks/set-state-in-effect`): assim, a autoavaliação de uma
  // abertura cancelada nunca vaza para a próxima, sem precisar de um efeito. Cobre tanto o botão
  // "Voltar" quanto Esc/clique fora (ambos passam por `onOpenChange`).
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setFormError(null);
      reset(DEFAULT_VALUES);
    }
    onOpenChange(nextOpen);
  }

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      const result = await finishFocusSessionAction({
        sessionId,
        goalAchieved: values.goalAchieved === "" ? undefined : values.goalAchieved === "yes",
        contentStudied: values.contentStudied.trim() || undefined,
        focusLevel: values.focusLevel === "" ? undefined : values.focusLevel,
        doubtNote: values.doubtNote.trim() || undefined,
      });

      if (!result.ok) {
        if (result.error.code === "CONFLICT") {
          onConflict(result.error.message);
          return;
        }
        if (result.error.fieldErrors) {
          for (const [field, messages] of Object.entries(result.error.fieldErrors)) {
            const message = messages[0];
            const clientField = SERVER_TO_CLIENT_FIELD[field];
            if (message && clientField) {
              setError(clientField, { message });
            }
          }
        }
        setFormError(result.error.message);
        return;
      }

      onFinished(result.data);
    });
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        aria-describedby="focus-finish-dialog-description"
        className="max-h-[85vh] max-w-lg overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>Encerrar sessão de foco</DialogTitle>
          <DialogDescription id="focus-finish-dialog-description">
            Registre como foi esta sessão — quem decide se ela pontua é sempre o servidor, a partir da atividade
            real registrada durante o tempo em que ela ficou ativa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">
              {objective ? `Você concluiu: "${objective}"?` : "Você sente que atingiu o que pretendia nesta sessão?"}
            </legend>
            <div className="flex gap-2">
              <button
                type="button"
                aria-pressed={goalAchieved === "yes"}
                onClick={() => setValue("goalAchieved", goalAchieved === "yes" ? "" : "yes")}
                className={cn(
                  "border-input flex flex-1 items-center justify-center gap-1.5 rounded-lg border p-2 text-sm transition-colors",
                  goalAchieved === "yes" && "border-success bg-success/10 text-success",
                )}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Sim
              </button>
              <button
                type="button"
                aria-pressed={goalAchieved === "no"}
                onClick={() => setValue("goalAchieved", goalAchieved === "no" ? "" : "no")}
                className={cn(
                  "border-input flex flex-1 items-center justify-center gap-1.5 rounded-lg border p-2 text-sm transition-colors",
                  goalAchieved === "no" && "border-destructive bg-destructive/10 text-destructive",
                )}
              >
                <XCircle className="h-4 w-4" aria-hidden="true" />
                Não
              </button>
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="focus-finish-content">O que você estudou? (opcional)</Label>
            <textarea
              id="focus-finish-content"
              rows={3}
              aria-invalid={Boolean(errors.contentStudied)}
              className={TEXTAREA_CLASS}
              {...register("contentStudied")}
            />
            <FieldError message={errors.contentStudied?.message} />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Nível de foco (opcional)</legend>
            <div className="grid grid-cols-5 gap-1.5">
              {FOCUS_LEVEL_OPTIONS.map((level) => (
                <button
                  key={level}
                  type="button"
                  aria-pressed={focusLevel === level}
                  onClick={() => setValue("focusLevel", focusLevel === level ? "" : level)}
                  title={FOCUS_LEVEL_LABEL[level]}
                  className={cn(
                    "border-input flex flex-col items-center gap-0.5 rounded-lg border p-2 text-sm font-semibold transition-colors",
                    focusLevel === level && "border-primary bg-primary/10 text-primary",
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
            {typeof focusLevel === "number" && isFocusLevel(focusLevel) ? (
              <p className="text-muted-foreground text-xs">{FOCUS_LEVEL_LABEL[focusLevel]}</p>
            ) : null}
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="focus-finish-doubt">Ficou alguma dúvida? (opcional)</Label>
            <textarea
              id="focus-finish-doubt"
              rows={2}
              aria-invalid={Boolean(errors.doubtNote)}
              className={TEXTAREA_CLASS}
              {...register("doubtNote")}
            />
            <FieldError message={errors.doubtNote?.message} />
          </div>

          {formError ? (
            <p role="alert" className="text-destructive text-sm">
              {formError}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
              Voltar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enviando..." : "Encerrar sessão"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
