"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Dices } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { DIFFICULTY_LABEL } from "@/components/simulations/labels";
import {
  mockExamModeSchema,
  questionDifficultySchema,
  type MockExamMode,
  type SubjectOptionDTO,
  type TopicOptionDTO,
} from "@/contracts/simulations";
import { createAttemptAction, listTopicOptionsAction } from "@/server/actions/simulations";

interface ContestOption {
  id: string;
  name: string;
}

interface CourseOption {
  id: string;
  title: string;
  contestId: string;
}

interface MockExamBuilderFormProps {
  contests: ContestOption[];
  courses: CourseOption[];
  subjects: SubjectOptionDTO[];
}

const MODE_OPTIONS: { value: MockExamMode; label: string; hint: string }[] = [
  { value: "RANDOM", label: "Aleatórias", hint: "Questões sorteadas dentro do filtro escolhido." },
  { value: "WRONG_ONLY", label: "Só as que já errei", hint: "Reforça o caderno de erros." },
  { value: "NEW_ONLY", label: "Só questões novas", hint: "Nunca respondidas por você." },
];

/**
 * Schema client-side (UX apenas — CLAUDE.md §9). Deliberadamente mais permissivo que
 * `mockExamConfigInputSchema` (ex.: `timeLimitMinutes` fica como texto bruto, convertido só no
 * submit) porque os campos vêm de `<select>`/`<input>` nativos onde "" significa "sem filtro".
 * `createAttemptAction` sempre revalida com o schema real no servidor.
 */
const builderFormSchema = z.object({
  contestId: z.string(),
  courseId: z.string(),
  subjectId: z.string(),
  topicId: z.string(),
  board: z.string().max(120, "Máximo de 120 caracteres."),
  difficulty: z.union([z.literal(""), questionDifficultySchema]),
  quantity: z.coerce
    .number()
    .int("A quantidade deve ser um número inteiro.")
    .min(1, "Informe ao menos 1 questão.")
    .max(120, "Máximo de 120 questões."),
  timeLimitMinutes: z
    .string()
    .refine(
      (value) => value.trim() === "" || (/^\d+$/.test(value.trim()) && Number(value) >= 1 && Number(value) <= 600),
      "Informe um tempo entre 1 e 600 minutos, ou deixe em branco para sem limite.",
    ),
  mode: mockExamModeSchema,
});
/**
 * `quantity` usa `z.coerce.number()` — o tipo de ENTRADA (o que o `<input>` produz, `unknown`)
 * difere do tipo de SAÍDA (o que chega em `handleSubmit`, `number`). RHF precisa dos dois
 * (`useForm<Input, Context, Output>`) para tipar `register`/`watch` (entrada) e o callback de
 * `handleSubmit` (saída) corretamente — padrão documentado de `@hookform/resolvers` para
 * schemas Zod com coerção/transformação.
 */
type BuilderFormInput = z.input<typeof builderFormSchema>;
type BuilderFormValues = z.infer<typeof builderFormSchema>;

const FORM_FIELD_NAMES = new Set(Object.keys(builderFormSchema.shape));

const DEFAULT_VALUES: BuilderFormInput = {
  contestId: "",
  courseId: "",
  subjectId: "",
  topicId: "",
  board: "",
  difficulty: "",
  quantity: 10,
  timeLimitMinutes: "",
  mode: "RANDOM",
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
 * Formulário "Montar simulado personalizado" (React Hook Form + Zod). Client Component:
 * cascata concurso -> curso (filtro em memória sobre a lista já carregada, sem nova
 * requisição — mesmo padrão de `CourseCatalog`) e matéria -> assunto (busca
 * `listTopicOptionsAction` ao trocar a matéria, já que assuntos são numerosos por matéria).
 *
 * Selecionar uma matéria/curso/concurso é sempre OPCIONAL — o backend (`resolveSubjectIds`,
 * `@/server/services/simulations/question-pool.ts`) resolve a hierarquia contestId -> courseId
 * -> subjectId, dando prioridade à matéria quando informada. `createAttemptAction` é a única
 * fonte que decide quais questões entram no simulado e qual o tempo limite real.
 */
export function MockExamBuilderForm({ contests, courses, subjects }: MockExamBuilderFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  // Guarda os assuntos junto do `subjectId` para o qual foram buscados — permite DERIVAR
  // `topics`/`topicsLoading` abaixo (comparando com o `subjectId` atual) em vez de precisar
  // "limpar" estado sincronamente dentro do efeito quando a matéria muda (o que a regra
  // `react-hooks/set-state-in-effect` rejeita fora de um callback assíncrono).
  const [topicsResult, setTopicsResult] = useState<{ subjectId: string; items: TopicOptionDTO[] } | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors },
  } = useForm<BuilderFormInput, unknown, BuilderFormValues>({
    resolver: zodResolver(builderFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  // `useWatch` (não `methods.watch()`) — a função `watch()` retornada por `useForm()` não pode
  // ser memoizada com segurança pelo React Compiler; `useWatch` é o hook equivalente
  // recomendado pelo React Hook Form para esse caso.
  const contestId = useWatch({ control, name: "contestId" });
  const subjectId = useWatch({ control, name: "subjectId" });

  const filteredCourses = useMemo(
    () => (contestId ? courses.filter((course) => course.contestId === contestId) : courses),
    [courses, contestId],
  );

  // Busca os assuntos da matéria selecionada (dependente — não faz sentido carregar todos os
  // assuntos de antemão). Guard de cancelamento evita "race" ao trocar a matéria rapidamente;
  // sem matéria selecionada, não há nada para buscar (os valores derivados abaixo já refletem
  // isso sem precisar de um `return` que limpe estado sincronamente).
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

  // Derivados (não `useState`): `topicsResult` só reflete o `subjectId` para o qual a busca já
  // respondeu, então comparar com o `subjectId` atual já cobre "matéria trocada" e "matéria
  // limpa" sem nenhum reset explícito.
  const topics = topicsResult?.subjectId === subjectId ? topicsResult.items : [];
  const topicsLoading = subjectId !== "" && topicsResult?.subjectId !== subjectId;

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      const result = await createAttemptAction({
        contestId: values.contestId || undefined,
        courseId: values.courseId || undefined,
        subjectId: values.subjectId || undefined,
        topicId: values.topicId || undefined,
        board: values.board.trim() || undefined,
        difficulty: values.difficulty || undefined,
        quantity: values.quantity,
        timeLimitMinutes: values.timeLimitMinutes.trim() ? Number(values.timeLimitMinutes) : undefined,
        mode: values.mode,
      });

      if (!result.ok) {
        if (result.error.fieldErrors) {
          for (const [field, messages] of Object.entries(result.error.fieldErrors)) {
            const firstMessage = messages[0];
            if (firstMessage && FORM_FIELD_NAMES.has(field)) {
              setError(field as keyof BuilderFormInput, { message: firstMessage });
            }
          }
        }
        setFormError(result.error.message);
        return;
      }

      toast.success("Simulado criado! Boa prova.");
      router.push(`/simulados/${result.data.id}`);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="builder-contest">Concurso</Label>
          <NativeSelect
            id="builder-contest"
            aria-invalid={Boolean(errors.contestId)}
            {...register("contestId", { onChange: () => setValue("courseId", "") })}
          >
            <option value="">Qualquer concurso</option>
            {contests.map((contest) => (
              <option key={contest.id} value={contest.id}>
                {contest.name}
              </option>
            ))}
          </NativeSelect>
          <FieldError message={errors.contestId?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="builder-course">Curso</Label>
          <NativeSelect id="builder-course" aria-invalid={Boolean(errors.courseId)} {...register("courseId")}>
            <option value="">Qualquer curso</option>
            {filteredCourses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </NativeSelect>
          <FieldError message={errors.courseId?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="builder-subject">Matéria</Label>
          <NativeSelect
            id="builder-subject"
            aria-invalid={Boolean(errors.subjectId)}
            {...register("subjectId", { onChange: () => setValue("topicId", "") })}
          >
            <option value="">Qualquer matéria</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </NativeSelect>
          <p className="text-muted-foreground text-xs">
            Uma matéria específica substitui o filtro por curso/concurso.
          </p>
          <FieldError message={errors.subjectId?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="builder-topic">Assunto</Label>
          <NativeSelect
            id="builder-topic"
            disabled={!subjectId || topicsLoading}
            aria-invalid={Boolean(errors.topicId)}
            {...register("topicId")}
          >
            <option value="">
              {!subjectId ? "Selecione uma matéria primeiro" : topicsLoading ? "Carregando..." : "Qualquer assunto"}
            </option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </NativeSelect>
          <FieldError message={errors.topicId?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="builder-board">Banca</Label>
          <Input
            id="builder-board"
            placeholder="Ex.: CESPE/Cebraspe"
            aria-invalid={Boolean(errors.board)}
            {...register("board")}
          />
          <FieldError message={errors.board?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="builder-difficulty">Dificuldade</Label>
          <NativeSelect id="builder-difficulty" aria-invalid={Boolean(errors.difficulty)} {...register("difficulty")}>
            <option value="">Qualquer dificuldade</option>
            {questionDifficultySchema.options.map((value) => (
              <option key={value} value={value}>
                {DIFFICULTY_LABEL[value]}
              </option>
            ))}
          </NativeSelect>
          <FieldError message={errors.difficulty?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="builder-quantity">Quantidade de questões</Label>
          <Input
            id="builder-quantity"
            type="number"
            min={1}
            max={120}
            aria-invalid={Boolean(errors.quantity)}
            {...register("quantity")}
          />
          <FieldError message={errors.quantity?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="builder-time-limit">Tempo limite (minutos)</Label>
          <Input
            id="builder-time-limit"
            type="number"
            min={1}
            max={600}
            placeholder="Sem limite"
            aria-invalid={Boolean(errors.timeLimitMinutes)}
            {...register("timeLimitMinutes")}
          />
          <FieldError message={errors.timeLimitMinutes?.message} />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Modo</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {MODE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="border-input has-[input:checked]:border-primary has-[input:checked]:bg-primary/5 flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-sm transition-colors"
            >
              <span className="flex items-center gap-2 font-medium">
                <input type="radio" value={option.value} className="accent-primary" {...register("mode")} />
                {option.label}
              </span>
              <span className="text-muted-foreground text-xs">{option.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {formError ? (
        <p role="alert" className="text-destructive text-sm">
          {formError}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        <Dices aria-hidden="true" />
        {isPending ? "Montando simulado..." : "Montar simulado"}
      </Button>
    </form>
  );
}
