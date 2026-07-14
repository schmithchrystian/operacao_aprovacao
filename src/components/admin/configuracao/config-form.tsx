"use client";

import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  gamificationRewardsSchema,
  rankingWeightsSchema,
  type AdminBusinessConfigDTO,
  type GamificationRewardsInput,
} from "@/contracts/admin-config";
import { updateBusinessConfigForAdminAction } from "@/server/actions/admin/config";

interface ConfigFormProps {
  initialConfig: AdminBusinessConfigDTO;
}

const REWARD_LABEL: Record<keyof GamificationRewardsInput, string> = {
  LESSON_COMPLETED: "Aula concluída",
  MODULE_COMPLETED: "Módulo concluído",
  COURSE_COMPLETED: "Curso concluído",
  FLASHCARD_CORRECT: "Flashcard correto",
  POMODORO_COMPLETED: "Pomodoro concluído",
  MOCK_EXAM_COMPLETED: "Simulado concluído",
  QUESTION_CORRECT: "Questão correta",
  DAILY_GOAL_COMPLETED: "Meta diária concluída",
  WEEKLY_GOAL_COMPLETED: "Meta semanal concluída",
  STREAK_7: "Sequência de 7 dias",
  STREAK_30: "Sequência de 30 dias",
  MANUAL_ADJUSTMENT: "Ajuste manual",
};
const REWARD_KEYS = Object.keys(REWARD_LABEL) as (keyof GamificationRewardsInput)[];

const WEIGHT_LABEL: Record<keyof z.infer<typeof rankingWeightsSchema>, string> = {
  simuladoPerformance: "Desempenho em simulados",
  lessonsCompleted: "Aulas concluídas",
  consistency: "Consistência",
  validTime: "Tempo válido de estudo",
  goalsCompleted: "Metas concluídas",
};
const WEIGHT_KEYS = Object.keys(WEIGHT_LABEL) as (keyof z.infer<typeof rankingWeightsSchema>)[];

/** Formulário completo submetido de uma vez — não é o PATCH parcial do contrato
 *  (`updateBusinessConfigInputSchema` aceita subconjuntos), mas o servidor aceita um objeto
 *  totalmente preenchido como um caso particular válido do PATCH. */
const configFormSchema = z.object({
  lessonCompletionMinPercent: z.number().min(1, "Mínimo 1%.").max(100, "Máximo 100%."),
  dailyGoalTargetPoints: z.number().int().min(0).max(1_000_000),
  weeklyGoalTargetPoints: z.number().int().min(0).max(1_000_000),
  gamificationRewards: gamificationRewardsSchema,
  rankingWeights: rankingWeightsSchema,
});
type ConfigFormValues = z.infer<typeof configFormSchema>;

/**
 * Formulário de Configuração (Fase 17 — item 5 da tarefa). Só `admin` (`SENSITIVE_ADMIN_ONLY_ROLES`)
 * — a página (`/admin/configuracao/page.tsx`) já mostra o erro `FORBIDDEN` para moderador antes
 * de chegar aqui. `lessonCompletionMinPercent` é editado como percentual (1–100) na UI e
 * convertido para fração (0.01–1) só no envio, mais intuitivo que digitar "0.75".
 */
export function ConfigForm({ initialConfig }: ConfigFormProps) {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ConfigFormValues>({
    resolver: zodResolver(configFormSchema),
    defaultValues: {
      lessonCompletionMinPercent: Math.round(initialConfig.lessonCompletionMinPercent * 100),
      dailyGoalTargetPoints: initialConfig.dailyGoalTargetPoints,
      weeklyGoalTargetPoints: initialConfig.weeklyGoalTargetPoints,
      gamificationRewards: initialConfig.gamificationRewards,
      rankingWeights: initialConfig.rankingWeights,
    },
  });

  // `useWatch` (não `watch()`) — mesmo padrão de `@/components/simulations/mock-exam-builder-form.tsx`.
  const weights = useWatch({ control, name: "rankingWeights" });
  const weightSum = WEIGHT_KEYS.reduce((sum, key) => sum + (Number(weights?.[key]) || 0), 0);
  const weightSumOk = Math.abs(weightSum - 1) <= 0.01;

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      const result = await updateBusinessConfigForAdminAction({
        lessonCompletionMinPercent: values.lessonCompletionMinPercent / 100,
        dailyGoalTargetPoints: values.dailyGoalTargetPoints,
        weeklyGoalTargetPoints: values.weeklyGoalTargetPoints,
        gamificationRewards: values.gamificationRewards,
        rankingWeights: values.rankingWeights,
      });

      if (!result.ok) {
        setFormError(result.error.message);
        return;
      }

      toast.success("Configuração atualizada.");
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <div className="border-primary/30 bg-primary/5 flex gap-3 rounded-lg border p-4 text-sm">
        <AlertTriangle className="text-primary h-5 w-5 shrink-0" aria-hidden="true" />
        <p className="text-foreground">
          <strong>Este ajuste ainda não é aplicado automaticamente pelos motores de pontuação/ranking.</strong> Hoje ele
          só registra a intenção do admin — os motores reais (gamificação, ranking, estudo) continuam usando os
          valores padrão de <code className="font-mono">config/business.ts</code> até essa integração ser feita junto
          com o agente de gamificação. Ajustar aqui não muda o comportamento do app ainda.
        </p>
      </div>

      {initialConfig.hasOverrides ? (
        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
          Há valores sobrescritos em relação ao padrão
        </Badge>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Parâmetros gerais</CardTitle>
          <CardDescription>Percentual mínimo de conclusão de aula e metas de pontos.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="config-completion">Conclusão mínima da aula (%)</Label>
            <Input
              id="config-completion"
              type="number"
              min={1}
              max={100}
              aria-invalid={Boolean(errors.lessonCompletionMinPercent)}
              {...register("lessonCompletionMinPercent", { valueAsNumber: true })}
            />
            {errors.lessonCompletionMinPercent?.message ? (
              <p role="alert" className="text-destructive text-sm">
                {errors.lessonCompletionMinPercent.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="config-daily-goal">Meta diária (pontos)</Label>
            <Input
              id="config-daily-goal"
              type="number"
              min={0}
              {...register("dailyGoalTargetPoints", { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="config-weekly-goal">Meta semanal (pontos)</Label>
            <Input
              id="config-weekly-goal"
              type="number"
              min={0}
              {...register("weeklyGoalTargetPoints", { valueAsNumber: true })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recompensas de gamificação</CardTitle>
          <CardDescription>Pontos e XP concedidos por evento.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {REWARD_KEYS.map((key) => (
            <div key={key} className="grid grid-cols-3 items-center gap-3 sm:grid-cols-[1fr_120px_120px]">
              <Label htmlFor={`config-reward-${key}-points`} className="text-sm font-normal">
                {REWARD_LABEL[key]}
              </Label>
              <div className="space-y-1">
                <Input
                  id={`config-reward-${key}-points`}
                  type="number"
                  min={0}
                  aria-label={`${REWARD_LABEL[key]} — pontos`}
                  placeholder="Pontos"
                  {...register(`gamificationRewards.${key}.points`, { valueAsNumber: true })}
                />
              </div>
              <Input
                type="number"
                min={0}
                aria-label={`${REWARD_LABEL[key]} — XP`}
                placeholder="XP"
                {...register(`gamificationRewards.${key}.xp`, { valueAsNumber: true })}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pesos de ranking</CardTitle>
          <CardDescription>
            Devem somar 1. Soma atual:{" "}
            <span className={weightSumOk ? "text-success font-medium" : "text-destructive font-medium"}>
              {weightSum.toFixed(2)}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WEIGHT_KEYS.map((key) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`config-weight-${key}`}>{WEIGHT_LABEL[key]}</Label>
              <Input
                id={`config-weight-${key}`}
                type="number"
                min={0}
                max={1}
                step={0.01}
                {...register(`rankingWeights.${key}`, { valueAsNumber: true })}
              />
            </div>
          ))}
        </CardContent>
        {!weightSumOk ? (
          <CardContent className="pt-0">
            <p role="alert" className="text-destructive text-sm">
              Os pesos precisam somar aproximadamente 1 — o servidor rejeitará o envio caso contrário.
            </p>
          </CardContent>
        ) : null}
      </Card>

      {formError ? (
        <p role="alert" className="text-destructive text-sm">
          {formError}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar configuração"}
        </Button>
      </div>
    </form>
  );
}
