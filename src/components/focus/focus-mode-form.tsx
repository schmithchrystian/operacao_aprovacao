"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Info, Play } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FOCUS } from "@/config/business";
import { focusModeSchema, type FocusSessionDTO } from "@/contracts/focus";
import type { SubjectOptionDTO, TopicOptionDTO } from "@/contracts/simulations";
import { startFocusSessionAction } from "@/server/actions/focus";
import { listTopicOptionsAction } from "@/server/actions/simulations";
import { FOCUS_MODE_HINT, FOCUS_MODE_ICON, FOCUS_MODE_LABEL } from "./labels";

interface FocusModeFormProps {
  subjects: SubjectOptionDTO[];
  onStarted: (session: FocusSessionDTO, meta: { subjectName: string | null; topicName: string | null }) => void;
}

const MODE_OPTIONS = focusModeSchema.options;

/**
 * Schema client-side (UX apenas — CLAUDE.md §9, mesmo padrão de `StudySessionBuilderForm`):
 * `subjectId`/`topicId` aceitam string vazia aqui (select "Nenhuma") — convertidas para
 * `undefined` em `onSubmit` antes de chamar `startFocusSessionAction`, que revalida com o
 * `idSchema.optional()` real (`@/contracts/focus`). A dependência condicional de
 * `customFocusMinutes` no modo `custom` espelha o `.superRefine` de `pomodoroConfigInputSchema` —
 * mesma regra, duplicada aqui só para dar feedback imediato (o servidor é sempre quem decide).
 */
const formSchema = z
  .object({
    mode: focusModeSchema,
    customFocusMinutes: z.coerce
      .number()
      .int()
      .min(FOCUS.customMinFocusMinutes, `Informe ao menos ${FOCUS.customMinFocusMinutes} minutos.`)
      .max(FOCUS.customMaxFocusMinutes, `Máximo de ${FOCUS.customMaxFocusMinutes} minutos.`)
      .optional(),
    customBreakMinutes: z.coerce
      .number()
      .int()
      .min(FOCUS.customMinBreakMinutes)
      .max(FOCUS.customMaxBreakMinutes, `Máximo de ${FOCUS.customMaxBreakMinutes} minutos de pausa.`)
      .optional(),
    subjectId: z.string(),
    topicId: z.string(),
    objective: z.string().max(FOCUS.objectiveMaxLength, "Objetivo muito longo."),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "custom" && data.customFocusMinutes === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe a duração de foco para o modo personalizado.",
        path: ["customFocusMinutes"],
      });
    }
  });
type FormInput = z.input<typeof formSchema>;
type FormValues = z.infer<typeof formSchema>;

const DEFAULT_VALUES: FormInput = {
  mode: "25_5",
  customFocusMinutes: undefined,
  customBreakMinutes: undefined,
  subjectId: "",
  topicId: "",
  objective: "",
};

const SERVER_TO_CLIENT_FIELD: Record<string, keyof FormInput> = {
  mode: "mode",
  customFocusMinutes: "customFocusMinutes",
  customBreakMinutes: "customBreakMinutes",
  subjectId: "subjectId",
  topicId: "topicId",
  objective: "objective",
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-destructive text-sm">
      {message}
    </p>
  );
}

/**
 * Formulário de início do Modo Foco (Fase 15 — UI, itens 1-2 da tarefa). Único responsável por
 * chamar `startFocusSessionAction` — a partir daí, todo o controle passa para `FocusTimer`
 * (`FocusWorkspace` troca de fase). Cascata matéria -> assunto via `listTopicOptionsAction`,
 * mesmo padrão de `StudySessionBuilderForm`/`CardFormDialog`.
 *
 * `subjectName`/`topicName` (resolvidos aqui, a partir das listas já carregadas) seguem junto no
 * callback `onStarted` só para EXIBIÇÃO durante o timer — `FocusSessionDTO` guarda apenas os ids
 * (`subjectId`/`topicId`), nunca os nomes; não existe uma consulta própria desta fase para
 * resolver nome a partir de id no meio da sessão, e criar uma só para isso seria inventar
 * superfície de backend que a tarefa não pede.
 */
export function FocusModeForm({ subjects, onStarted }: FocusModeFormProps) {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [topicsResult, setTopicsResult] = useState<{ subjectId: string; items: TopicOptionDTO[] } | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const mode = useWatch({ control, name: "mode" });
  const subjectId = useWatch({ control, name: "subjectId" });

  useEffect(() => {
    if (!subjectId) return;
    let cancelled = false;

    listTopicOptionsAction({ subjectId }).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setTopicsResult({ subjectId, items: result.data });
      } else {
        setTopicsResult({ subjectId, items: [] });
        toast.error(result.error.message);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  const topics = topicsResult?.subjectId === subjectId ? topicsResult.items : [];
  const topicsLoading = subjectId !== "" && topicsResult?.subjectId !== subjectId;

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      const result = await startFocusSessionAction({
        mode: values.mode,
        customFocusMinutes: values.mode === "custom" ? values.customFocusMinutes : undefined,
        customBreakMinutes: values.mode === "custom" ? values.customBreakMinutes : undefined,
        subjectId: values.subjectId || undefined,
        topicId: values.topicId || undefined,
        objective: values.objective.trim() || undefined,
      });

      if (!result.ok) {
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

      const subjectName = subjects.find((subject) => subject.id === values.subjectId)?.name ?? null;
      const topicName = topics.find((topic) => topic.id === values.topicId)?.name ?? null;
      toast.success("Sessão de foco iniciada. Bons estudos!");
      onStarted(result.data, { subjectName, topicName });
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Escolha seu modo de foco</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Modo</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {MODE_OPTIONS.map((value) => {
                const Icon = FOCUS_MODE_ICON[value];
                return (
                  <label
                    key={value}
                    className="border-input has-[input:checked]:border-primary has-[input:checked]:bg-primary/5 flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm transition-colors"
                  >
                    <input type="radio" value={value} className="accent-primary mt-0.5" {...register("mode")} />
                    <span className="space-y-0.5">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {FOCUS_MODE_LABEL[value]}
                      </span>
                      <span className="text-muted-foreground block text-xs">{FOCUS_MODE_HINT[value]}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            <FieldError message={errors.mode?.message} />
          </fieldset>

          {mode === "custom" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="focus-custom-minutes">Minutos de foco</Label>
                <Input
                  id="focus-custom-minutes"
                  type="number"
                  min={FOCUS.customMinFocusMinutes}
                  max={FOCUS.customMaxFocusMinutes}
                  aria-invalid={Boolean(errors.customFocusMinutes)}
                  {...register("customFocusMinutes")}
                />
                <FieldError message={errors.customFocusMinutes?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="focus-custom-break">Minutos de pausa (opcional)</Label>
                <Input
                  id="focus-custom-break"
                  type="number"
                  min={FOCUS.customMinBreakMinutes}
                  max={FOCUS.customMaxBreakMinutes}
                  aria-invalid={Boolean(errors.customBreakMinutes)}
                  {...register("customBreakMinutes")}
                />
                <FieldError message={errors.customBreakMinutes?.message} />
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="focus-subject">Matéria (opcional)</Label>
              <NativeSelect id="focus-subject" {...register("subjectId", { onChange: () => setValue("topicId", "") })}>
                <option value="">Nenhuma</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="focus-topic">Assunto (opcional)</Label>
              <NativeSelect id="focus-topic" disabled={!subjectId || topicsLoading} {...register("topicId")}>
                <option value="">
                  {!subjectId ? "Selecione uma matéria primeiro" : topicsLoading ? "Carregando..." : "Nenhum"}
                </option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="focus-objective">Objetivo desta sessão (opcional)</Label>
            <Input
              id="focus-objective"
              placeholder="Ex.: Resolver 20 questões de Direito Constitucional"
              maxLength={FOCUS.objectiveMaxLength}
              aria-invalid={Boolean(errors.objective)}
              {...register("objective")}
            />
            <FieldError message={errors.objective?.message} />
          </div>

          {formError ? (
            <p role="alert" className="text-destructive text-sm">
              {formError}
            </p>
          ) : null}

          <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Iniciar uma sessão aqui encerra automaticamente qualquer sessão de foco que ainda esteja ativa — nesta
            conta, em outra aba ou em outro dispositivo.
          </p>

          <Button type="submit" disabled={isPending}>
            <Play aria-hidden="true" />
            {isPending ? "Iniciando..." : "Iniciar sessão de foco"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
