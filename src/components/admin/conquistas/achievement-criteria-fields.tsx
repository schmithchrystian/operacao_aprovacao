"use client";
import { useId } from "react";
import type { AchievementCriteria } from "@/contracts/achievement-criteria";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
const metrics: Record<AchievementCriteria["metric"], string> = {
  lessonsCompleted: "Aulas concluídas",
  firstWeekFullyActive: "Primeira semana completa (1 = sim)",
  streakDays: "Dias consecutivos",
  mockExamsCompleted: "Simulados concluídos",
  bestMockExamAccuracyPercent: "Melhor aproveitamento (%)",
  mockExamsAboveAccuracyThreshold: "Simulados acima de 90%",
  questionsCorrect: "Questões corretas",
  studyHours: "Horas válidas",
  flashcardsMastered: "Revisões corretas de flashcards",
  weeklyGoalsCompleted: "Metas semanais",
};
export function AchievementCriteriaFields({
  value,
  onChange,
}: {
  value: AchievementCriteria | null;
  onChange: (value: AchievementCriteria | null) => void;
}) {
  const id = useId();
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Critério de conquista</legend>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value !== null}
          onChange={(event) =>
            onChange(
              event.target.checked
                ? { metric: "lessonsCompleted", operator: "gte", threshold: 1 }
                : null,
            )
          }
        />
        Definir critério automático
      </label>
      {value ? (
        <div className="grid gap-2 sm:grid-cols-3">
          <div>
            <Label htmlFor={`${id}-metric`}>Métrica</Label>
            <NativeSelect
              id={`${id}-metric`}
              value={value.metric}
              onChange={(event) =>
                onChange({ ...value, metric: event.target.value as AchievementCriteria["metric"] })
              }
            >
              {Object.entries(metrics).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <Label htmlFor={`${id}-operator`}>Condição</Label>
            <NativeSelect
              id={`${id}-operator`}
              value={value.operator}
              onChange={(event) =>
                onChange({
                  ...value,
                  operator: event.target.value as AchievementCriteria["operator"],
                })
              }
            >
              <option value="gte">Pelo menos</option>
              <option value="gt">Maior que</option>
            </NativeSelect>
          </div>
          <div>
            <Label htmlFor={`${id}-threshold`}>Valor</Label>
            <Input
              id={`${id}-threshold`}
              type="number"
              min={0}
              max={1000000}
              value={value.threshold}
              onChange={(event) => onChange({ ...value, threshold: Number(event.target.value) })}
            />
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">
          Conquistas existentes usam o critério original. Uma nova chave precisa de um critério para
          ser desbloqueada.
        </p>
      )}
    </fieldset>
  );
}
