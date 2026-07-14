"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { SubjectOptionDTO } from "@/contracts/simulations";
import type { GeneratePlanInput, StudyPlanDTO } from "@/contracts/study-plan";
import { generatePlanAction } from "@/server/actions/study-plan";

interface GeneratePlanFormProps {
  subjects: SubjectOptionDTO[];
  onGenerated: (plan: StudyPlanDTO) => void;
}

const DAYS_PER_WEEK_OPTIONS = [1, 2, 3, 4, 5, 6, 7] as const;

const subjectRowSchema = z.object({
  included: z.boolean(),
  weight: z.coerce.number().min(0.1, "Peso mínimo é 0,1.").max(10, "Peso máximo é 10."),
});

/**
 * Schema client-side (UX apenas — CLAUDE.md §9; `generatePlanAction` sempre revalida com
 * `generatePlanInputSchema` no servidor). `subjects` espelha, POR ÍNDICE, a prop `subjects`
 * (mesma ordem, nunca reordenada) — só guarda `included`/`weight` por linha; `subjectId` vem de
 * volta do próprio array de props no submit, então não precisa de um campo oculto por linha.
 *
 * Não pede `startDate` (o servidor sempre resolve "hoje" — CLAUDE.md "resolvido no SERVIDOR,
 * nunca no cliente") nem valida aqui "prova depois do início": essa regra (e o limite de 2 anos)
 * só existe no schema do servidor, que devolve o erro em `examDate` — mapeado de volta ao campo
 * pelo mesmo mecanismo de `fieldErrors` usado no resto do projeto.
 */
const generatePlanFormSchema = z.object({
  title: z.string().max(160, "Máximo de 160 caracteres."),
  examDate: z.string().min(1, "Informe a data da prova."),
  daysPerWeek: z.coerce.number().int().min(1).max(7),
  hoursPerDay: z.coerce
    .number()
    .min(0.5, "Informe ao menos 0,5 hora.")
    .max(16, "Máximo de 16 horas por dia."),
  includeReviews: z.boolean(),
  includeMockExams: z.boolean(),
  subjects: z.array(subjectRowSchema),
});
type GeneratePlanFormInput = z.input<typeof generatePlanFormSchema>;
type GeneratePlanFormValues = z.infer<typeof generatePlanFormSchema>;

const SERVER_TO_CLIENT_FIELD: Record<string, keyof GeneratePlanFormInput> = {
  title: "title",
  examDate: "examDate",
  daysPerWeek: "daysPerWeek",
  hoursPerDay: "hoursPerDay",
  subjectWeights: "subjects",
  includeReviews: "includeReviews",
  includeMockExams: "includeMockExams",
};

function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-destructive text-sm">
      {message}
    </p>
  );
}

/** `<input type="date">` sempre produz `yyyy-mm-dd` — concatenar a hora fixa evita qualquer
 *  ambiguidade de fuso horário na conversão (não usa `new Date(...)`/`Date.parse` aqui). */
function dateInputToIsoMidnightUtc(value: string): string {
  return `${value}T00:00:00.000Z`;
}

/**
 * Formulário de geração do plano de estudos (Fase 11 — UI do agente `frontend`, React Hook Form
 * + Zod). Exibido quando o aluno ainda não tem um plano ATIVO, ou quando pede para gerar um novo
 * (regenerar substitui os itens do plano existente — `generatePlanAction`/`generatePlan`).
 */
export function GeneratePlanForm({ subjects, onGenerated }: GeneratePlanFormProps) {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);

  const defaultValues = useMemo<GeneratePlanFormInput>(
    () => ({
      title: "",
      examDate: "",
      daysPerWeek: 6,
      hoursPerDay: 2,
      includeReviews: true,
      includeMockExams: true,
      subjects: subjects.map(() => ({ included: false, weight: 1 })),
    }),
    [subjects],
  );

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<GeneratePlanFormInput, unknown, GeneratePlanFormValues>({
    resolver: zodResolver(generatePlanFormSchema),
    defaultValues,
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    setSubjectsError(null);

    const subjectWeights = values.subjects
      .map((row, index) => ({
        subjectId: subjects[index]?.id,
        included: row.included,
        weight: row.weight,
      }))
      .filter(
        (row): row is { subjectId: string; included: true; weight: number } =>
          row.included && Boolean(row.subjectId),
      )
      .map(({ subjectId, weight }) => ({ subjectId, weight }));

    // Checagem manual (não um `.refine` no schema Zod) — evita a ambiguidade de RHF entre erro
    // "de raiz" e erros por índice num MESMO campo de array (`errors.subjects`); mais simples e
    // sem gambiarra de tipos.
    if (subjectWeights.length === 0) {
      setSubjectsError("Selecione ao menos uma matéria.");
      return;
    }

    const input: GeneratePlanInput = {
      title: values.title.trim() || undefined,
      examDate: dateInputToIsoMidnightUtc(values.examDate),
      daysPerWeek: values.daysPerWeek,
      hoursPerDay: values.hoursPerDay,
      subjectWeights,
      includeReviews: values.includeReviews,
      includeMockExams: values.includeMockExams,
    };

    startTransition(async () => {
      const result = await generatePlanAction(input);

      if (!result.ok) {
        if (result.error.fieldErrors) {
          for (const [field, messages] of Object.entries(result.error.fieldErrors)) {
            const firstMessage = messages[0];
            const clientField = SERVER_TO_CLIENT_FIELD[field];
            if (firstMessage && clientField) {
              setError(clientField, { message: firstMessage });
            }
          }
        }
        setFormError(result.error.message);
        return;
      }

      toast.success("Plano de estudos gerado!");
      onGenerated(result.data);
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Gerar plano de estudos</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="plan-title">Título (opcional)</Label>
              <Input
                id="plan-title"
                placeholder="Ex.: Reta final — Polícia Militar"
                {...register("title")}
              />
              <FieldError message={errors.title?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="plan-exam-date">Data da prova</Label>
              <Input
                id="plan-exam-date"
                type="date"
                aria-invalid={Boolean(errors.examDate)}
                {...register("examDate")}
              />
              <FieldError message={errors.examDate?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="plan-days-per-week">Dias de estudo por semana</Label>
              <NativeSelect id="plan-days-per-week" {...register("daysPerWeek")}>
                {DAYS_PER_WEEK_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value} dia(s)
                  </option>
                ))}
              </NativeSelect>
              <FieldError message={errors.daysPerWeek?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="plan-hours-per-day">Horas disponíveis por dia</Label>
              <Input
                id="plan-hours-per-day"
                type="number"
                min={0.5}
                max={16}
                step={0.5}
                aria-invalid={Boolean(errors.hoursPerDay)}
                {...register("hoursPerDay")}
              />
              <FieldError message={errors.hoursPerDay?.message} />
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Matérias e peso</legend>
            <p className="text-muted-foreground text-xs">
              Selecione as matérias do edital e o peso relativo de cada uma (não precisa somar 1).
            </p>
            {subjects.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma matéria cadastrada.</p>
            ) : (
              <div className="space-y-2">
                {subjects.map((subject, index) => (
                  <div
                    key={subject.id}
                    className="border-input has-[input[type=checkbox]:checked]:border-primary has-[input[type=checkbox]:checked]:bg-primary/5 flex flex-wrap items-center gap-3 rounded-lg border p-2.5"
                  >
                    <label className="flex flex-1 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="accent-primary h-4 w-4"
                        {...register(`subjects.${index}.included` as const)}
                      />
                      {subject.name}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <Label
                        htmlFor={`plan-subject-weight-${subject.id}`}
                        className="text-muted-foreground text-xs"
                      >
                        Peso
                      </Label>
                      <Input
                        id={`plan-subject-weight-${subject.id}`}
                        type="number"
                        min={0.1}
                        max={10}
                        step={0.1}
                        className="w-20"
                        aria-invalid={Boolean(errors.subjects?.[index]?.weight)}
                        {...register(`subjects.${index}.weight` as const)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <FieldError message={subjectsError} />
          </fieldset>

          <fieldset className="grid gap-2 sm:grid-cols-2">
            <legend className="sr-only">Preferências adicionais</legend>
            <label className="border-input has-[input:checked]:border-primary has-[input:checked]:bg-primary/5 flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm">
              <input
                type="checkbox"
                className="accent-primary h-4 w-4"
                {...register("includeReviews")}
              />
              Incluir sessões de revisão
            </label>
            <label className="border-input has-[input:checked]:border-primary has-[input:checked]:bg-primary/5 flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm">
              <input
                type="checkbox"
                className="accent-primary h-4 w-4"
                {...register("includeMockExams")}
              />
              Incluir simulados semanais
            </label>
          </fieldset>

          {formError ? (
            <p role="alert" className="text-destructive text-sm">
              {formError}
            </p>
          ) : null}

          <Button type="submit" disabled={isPending}>
            <Sparkles aria-hidden="true" />
            {isPending ? "Gerando plano..." : "Gerar plano de estudos"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
