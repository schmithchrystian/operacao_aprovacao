"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowRight, Rocket, Sparkles } from "lucide-react";
import { z } from "zod";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { DIFFICULTY_LABEL } from "@/components/simulations/labels";
import { cn, formatMinutesAsDuration } from "@/lib/utils";
import {
  contentTypeSchema,
  sessionDifficultySchema,
  type BuildSessionInput,
  type GeneratedSessionDTO,
  type StartStudyMissionResultDTO,
} from "@/contracts/study-session";
import type { SubjectOptionDTO, TopicOptionDTO } from "@/contracts/simulations";
import { buildSessionAction, startStudyMissionAction } from "@/server/actions/study-plan";
import { listTopicOptionsAction } from "@/server/actions/simulations";
import { CONTENT_TYPE_ICON } from "./content-type-icon";
import { SessionBlockList } from "./session-block-list";

interface ContestOption {
  id: string;
  name: string;
}

interface CourseOption {
  id: string;
  title: string;
  contestId: string;
}

interface StudySessionBuilderFormProps {
  contests: ContestOption[];
  courses: CourseOption[];
  subjects: SubjectOptionDTO[];
}

const CONTENT_TYPE_OPTIONS = contentTypeSchema.options;

const CONTENT_TYPE_LABEL: Record<(typeof CONTENT_TYPE_OPTIONS)[number], string> = {
  videoaula: "Videoaula",
  pdf: "PDF",
  questoes: "Questões",
  flashcards: "Flashcards",
  revisao: "Revisão",
  simulado: "Simulado",
  resumo: "Resumo",
  mapa_mental: "Mapa mental",
};

const AVAILABLE_MINUTES_OPTIONS = [30, 45, 60, 90, 120] as const;

/**
 * Schema client-side (UX apenas — CLAUDE.md §9, mesmo padrão de `MockExamBuilderForm`).
 * `teacherName` é deliberadamente um campo de TEXTO no formulário (não um select — não existe
 * `TeacherRepository`/listagem de professores nesta fase, ver `@/contracts/study-session`), mas
 * é enviado como `teacherId` no payload porque esse é o único campo que o contrato aceita para
 * o filtro "professor" — aceito e validado no servidor, porém ainda IGNORADO na resolução de
 * conteúdo (pendência já documentada no backend; o hint abaixo do campo deixa isso explícito
 * para o aluno em vez de esconder a limitação).
 */
const builderFormSchema = z.object({
  contestId: z.string(),
  courseId: z.string(),
  subjectId: z.string(),
  topicId: z.string(),
  teacherName: z.string().max(120, "Máximo de 120 caracteres."),
  difficulty: z.union([z.literal(""), sessionDifficultySchema]),
  contentTypes: z.array(contentTypeSchema).min(1, "Selecione ao menos um tipo de conteúdo."),
  availableMinutes: z.coerce
    .number()
    .int()
    .min(5, "Informe ao menos 5 minutos.")
    .max(480, "Máximo de 8 horas (480 minutos) por sessão."),
});
type BuilderFormInput = z.input<typeof builderFormSchema>;
type BuilderFormValues = z.infer<typeof builderFormSchema>;

/** Mapa nome-do-campo-cliente -> nome-do-campo-no-contrato do servidor (`BuildSessionInput`) —
 *  só diverge em `teacherName`/`teacherId` (ver comentário do schema acima). */
const SERVER_TO_CLIENT_FIELD: Record<string, keyof BuilderFormInput> = {
  contestId: "contestId",
  courseId: "courseId",
  subjectId: "subjectId",
  topicId: "topicId",
  teacherId: "teacherName",
  difficulty: "difficulty",
  contentTypes: "contentTypes",
  availableMinutes: "availableMinutes",
};

const DEFAULT_VALUES: BuilderFormInput = {
  contestId: "",
  courseId: "",
  subjectId: "",
  topicId: "",
  teacherName: "",
  difficulty: "",
  contentTypes: [],
  availableMinutes: 60,
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-destructive text-sm">
      {message}
    </p>
  );
}

function toBuildSessionInput(values: BuilderFormValues): BuildSessionInput {
  return {
    contestId: values.contestId || undefined,
    courseId: values.courseId || undefined,
    subjectId: values.subjectId || undefined,
    topicId: values.topicId || undefined,
    teacherId: values.teacherName.trim() || undefined,
    difficulty: values.difficulty || undefined,
    contentTypes: values.contentTypes,
    availableMinutes: values.availableMinutes,
  };
}

/**
 * Formulário "Montar estudo" (Fase 11 — UI do agente `frontend`, React Hook Form + Zod).
 * Client Component: cascata concurso -> curso (filtro em memória) e matéria -> assunto (busca
 * `listTopicOptionsAction`) — mesmo padrão de `MockExamBuilderForm`.
 *
 * Fluxo em duas etapas, como pedido pela Fase 11: (1) enviar o formulário chama
 * `buildSessionAction` e exibe a sessão gerada (preview, só leitura — nada é gravado); (2) o
 * botão "Iniciar missão de estudo" chama `startStudyMissionAction` com o MESMO filtro usado no
 * preview (guardado em `lastInput`), garantindo que a missão iniciada corresponda ao que o aluno
 * viu na tela (o servidor é determinístico — mesmo input, mesma alocação).
 */
export function StudySessionBuilderForm({
  contests,
  courses,
  subjects,
}: StudySessionBuilderFormProps) {
  const [isBuilding, startBuilding] = useTransition();
  const [isStarting, startStarting] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [generatedSession, setGeneratedSession] = useState<GeneratedSessionDTO | null>(null);
  const [lastInput, setLastInput] = useState<BuildSessionInput | null>(null);
  const [missionResult, setMissionResult] = useState<StartStudyMissionResultDTO | null>(null);
  const [topicsResult, setTopicsResult] = useState<{
    subjectId: string;
    items: TopicOptionDTO[];
  } | null>(null);

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

  const contestId = useWatch({ control, name: "contestId" });
  const subjectId = useWatch({ control, name: "subjectId" });

  const filteredCourses = contestId
    ? courses.filter((course) => course.contestId === contestId)
    : courses;

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
    const input = toBuildSessionInput(values);

    startBuilding(async () => {
      const result = await buildSessionAction(input);

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
        setGeneratedSession(null);
        setLastInput(null);
        return;
      }

      setGeneratedSession(result.data);
      setLastInput(input);
      setMissionResult(null);
    });
  });

  function handleStartMission() {
    if (!lastInput) return;

    startStarting(async () => {
      const result = await startStudyMissionAction(lastInput);

      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }

      setMissionResult(result.data);
      toast.success("Missão de estudo iniciada! Bora estudar.");
    });
  }

  const startingBlockHref = missionResult?.startingBlock.contentRef?.href ?? null;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Filtros e tempo disponível</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="session-contest">Concurso</Label>
                <NativeSelect
                  id="session-contest"
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
                <Label htmlFor="session-course">Curso</Label>
                <NativeSelect
                  id="session-course"
                  aria-invalid={Boolean(errors.courseId)}
                  {...register("courseId")}
                >
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
                <Label htmlFor="session-subject">Matéria</Label>
                <NativeSelect
                  id="session-subject"
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
                <FieldError message={errors.subjectId?.message} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="session-topic">Assunto</Label>
                <NativeSelect
                  id="session-topic"
                  disabled={!subjectId || topicsLoading}
                  aria-invalid={Boolean(errors.topicId)}
                  {...register("topicId")}
                >
                  <option value="">
                    {!subjectId
                      ? "Selecione uma matéria primeiro"
                      : topicsLoading
                        ? "Carregando..."
                        : "Qualquer assunto"}
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
                <Label htmlFor="session-teacher">Professor</Label>
                <Input
                  id="session-teacher"
                  placeholder="Nome do professor"
                  aria-invalid={Boolean(errors.teacherName)}
                  {...register("teacherName")}
                />
                <p className="text-muted-foreground text-xs">
                  Ainda não filtra o conteúdo nesta fase.
                </p>
                <FieldError message={errors.teacherName?.message} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="session-difficulty">Dificuldade</Label>
                <NativeSelect
                  id="session-difficulty"
                  aria-invalid={Boolean(errors.difficulty)}
                  {...register("difficulty")}
                >
                  <option value="">Qualquer dificuldade</option>
                  {sessionDifficultySchema.options.map((value) => (
                    <option key={value} value={value}>
                      {DIFFICULTY_LABEL[value]}
                    </option>
                  ))}
                </NativeSelect>
                <FieldError message={errors.difficulty?.message} />
              </div>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Tipos de conteúdo</legend>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {CONTENT_TYPE_OPTIONS.map((type) => {
                  const Icon = CONTENT_TYPE_ICON[type];
                  return (
                    <label
                      key={type}
                      className="border-input has-[input:checked]:border-primary has-[input:checked]:bg-primary/5 flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm transition-colors"
                    >
                      <input
                        type="checkbox"
                        value={type}
                        className="accent-primary"
                        {...register("contentTypes")}
                      />
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {CONTENT_TYPE_LABEL[type]}
                    </label>
                  );
                })}
              </div>
              <FieldError message={errors.contentTypes?.message} />
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Tempo disponível</legend>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {AVAILABLE_MINUTES_OPTIONS.map((minutes) => (
                  <label
                    key={minutes}
                    className="border-input has-[input:checked]:border-primary has-[input:checked]:bg-primary/5 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border p-2.5 text-sm transition-colors"
                  >
                    <input
                      type="radio"
                      value={minutes}
                      className="accent-primary"
                      {...register("availableMinutes")}
                    />
                    {minutes} min
                  </label>
                ))}
              </div>
              <FieldError message={errors.availableMinutes?.message} />
            </fieldset>

            {formError ? (
              <p role="alert" className="text-destructive text-sm">
                {formError}
              </p>
            ) : null}

            <Button type="submit" disabled={isBuilding}>
              <Sparkles aria-hidden="true" />
              {isBuilding ? "Montando sessão..." : "Montar sessão de estudo"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Sessão gerada</CardTitle>
          </CardHeader>
          <CardContent>
            {!generatedSession ? (
              <EmptyState
                icon={Sparkles}
                title="Monte sua sessão"
                description="Escolha os filtros e o tempo disponível ao lado para gerar uma sessão sob medida."
              />
            ) : (
              <div className="space-y-4">
                <div className="text-muted-foreground flex items-center justify-between text-sm">
                  <span>Total da sessão</span>
                  <span className="text-foreground font-semibold">
                    {formatMinutesAsDuration(generatedSession.totalMinutes)}
                  </span>
                </div>
                <SessionBlockList blocks={generatedSession.blocks} />
                <Button type="button" onClick={handleStartMission} disabled={isStarting}>
                  <Rocket aria-hidden="true" />
                  {isStarting ? "Iniciando missão..." : "Iniciar missão de estudo"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {missionResult ? (
          <Card className="border-success/40">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Missão iniciada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Primeiro bloco:{" "}
                <span className="text-foreground font-medium">
                  {missionResult.startingBlock.title}
                </span>{" "}
                ({missionResult.startingBlock.minutes} min)
              </p>
              {startingBlockHref ? (
                <Link href={startingBlockHref} className={cn(buttonVariants())}>
                  Ir para o conteúdo
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Este bloco ainda não tem um link direto — use o menu para encontrar o conteúdo.
                </p>
              )}
              <SessionBlockList
                blocks={missionResult.mission.blocks}
                currentBlockIndex={missionResult.mission.currentBlockIndex}
              />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
