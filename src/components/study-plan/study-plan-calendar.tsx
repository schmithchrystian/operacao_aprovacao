"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Flag,
  Grid3x3,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ProgressBar } from "@/components/shared/progress-bar";
import { formatMinutesAsDuration } from "@/lib/utils";
import type { StudyPlanDayDTO, StudyPlanDTO, StudyPlanItemDTO } from "@/contracts/study-plan";
import {
  getPlanAction,
  reorderPlanItemsAction,
  updatePlanItemAction,
} from "@/server/actions/study-plan";
import {
  addDaysIsoUTC,
  buildMonthGridDates,
  formatDayMonth,
  formatFullDate,
  formatMonthLabel,
  formatWeekdayShort,
  monthKeyIsoUTC,
  shiftMonthKey,
  weekStartIsoUTC,
} from "./date-format";
import { PlanItemRow } from "./plan-item-row";
import { reorderDayItems } from "./reorder-day-items";

interface StudyPlanCalendarProps {
  plan: StudyPlanDTO;
  onPlanUpdated: (plan: StudyPlanDTO) => void;
  onRequestRegenerate: () => void;
}

type ViewMode = "week" | "month";

interface DragSource {
  date: string;
  index: number;
}

function findDay(days: readonly StudyPlanDayDTO[], date: string): StudyPlanDayDTO | undefined {
  return days.find((day) => day.date === date);
}

/**
 * Calendário do plano de estudos (Fase 11 — UI do agente `frontend`). Client Component: recebe
 * o `StudyPlanDTO` já pronto do servidor e só REORGANIZA para exibição (agrupamento por
 * semana/mês já vem de `plan.weeklyCalendar`/`plan.monthlyCalendar` — nenhum cálculo de
 * progresso/peso é refeito aqui).
 *
 * Toda mutação (marcar concluído, reordenar) chama a Server Action e, no sucesso, busca o plano
 * atualizado inteiro via `getPlanAction` (nunca recalcula `progress`/pesos no cliente — CLAUDE.md
 * "não calcule progresso... como fonte definitiva"). Isso mantém a única fonte de verdade no
 * servidor ao custo de uma busca extra por mutação — aceitável aqui (backend em memória, sem
 * latência real) em troca de zero lógica de negócio duplicada no cliente.
 */
export function StudyPlanCalendar({
  plan,
  onPlanUpdated,
  onRequestRegenerate,
}: StudyPlanCalendarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [weekStart, setWeekStart] = useState(() => weekStartIsoUTC(plan.startDate));
  const [monthKey, setMonthKey] = useState(() => monthKeyIsoUTC(plan.startDate));
  const [isMutating, startMutating] = useTransition();
  const [doneOverrides, setDoneOverrides] = useState<Record<string, boolean>>({});
  const [dragSource, setDragSource] = useState<DragSource | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (plan.items.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={CalendarRange}
            title="Nenhum item no plano ainda"
            description="Gere um novo plano informando a data da prova e a disponibilidade de estudo."
            action={
              <Button type="button" variant="outline" onClick={onRequestRegenerate}>
                <RefreshCw aria-hidden="true" />
                Gerar plano
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  async function refreshPlan() {
    const result = await getPlanAction();
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    if (!result.data) {
      onRequestRegenerate();
      return;
    }
    onPlanUpdated(result.data);
  }

  function clearOverride(itemId: string) {
    setDoneOverrides((prev) => {
      if (!(itemId in prev)) return prev;
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  }

  function handleToggleDone(item: StudyPlanItemDTO, nextDone: boolean) {
    setDoneOverrides((prev) => ({ ...prev, [item.id]: nextDone }));

    startMutating(async () => {
      const result = await updatePlanItemAction({
        planId: plan.id,
        itemId: item.id,
        status: nextDone ? "DONE" : "PENDING",
      });

      if (!result.ok) {
        clearOverride(item.id);
        toast.error(result.error.message);
        return;
      }

      await refreshPlan();
      clearOverride(item.id);
    });
  }

  function handleReorder(day: StudyPlanDayDTO, fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    const itemIds = reorderDayItems(plan.items, day, fromIndex, toIndex);

    startMutating(async () => {
      const result = await reorderPlanItemsAction({ planId: plan.id, itemIds });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      await refreshPlan();
    });
  }

  function handleDragStart(date: string, index: number) {
    setDragSource({ date, index });
  }

  function handleDragOverIndex(date: string, index: number) {
    if (dragSource?.date !== date) return;
    setDragOverIndex(index);
  }

  function handleDragEnd() {
    setDragSource(null);
    setDragOverIndex(null);
  }

  function handleDrop(day: StudyPlanDayDTO, index: number) {
    const source = dragSource;
    setDragSource(null);
    setDragOverIndex(null);
    if (!source || source.date !== day.date) return;
    handleReorder(day, source.index, index);
  }

  function goToWeekOf(date: string) {
    setWeekStart(weekStartIsoUTC(date));
    setViewMode("week");
  }

  const weekDates = Array.from({ length: 7 }, (_, index) => addDaysIsoUTC(weekStart, index));
  const currentWeek = plan.weeklyCalendar.find((week) => week.weekStart === weekStart);
  const weekTotalMinutes = weekDates.reduce(
    (sum, date) => sum + (findDay(currentWeek?.days ?? [], date)?.totalMinutes ?? 0),
    0,
  );

  const monthDates = buildMonthGridDates(monthKey);
  const currentMonthGroup = plan.monthlyCalendar.find((group) => group.month === monthKey);
  // Cabeçalho de dias da semana (seg-dom) do grid mensal — NUNCA derivado das 7 primeiras
  // células de `monthDates` (podem ser `null`, preenchimento antes do dia 1 quando o mês não
  // começa numa segunda-feira). Ancorado na segunda-feira da semana da primeira célula real.
  const firstGridDate = monthDates.find((date): date is string => date !== null);
  const weekdayHeaderDates = firstGridDate
    ? Array.from({ length: 7 }, (_, index) => addDaysIsoUTC(weekStartIsoUTC(firstGridDate), index))
    : [];

  const { progress } = plan;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-3 space-y-0">
          <div className="space-y-1">
            <CardTitle>{plan.title}</CardTitle>
            {plan.examDate ? (
              <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                Prova em {formatFullDate(plan.examDate)}
                {progress.daysUntilExam !== null ? (
                  <span className="text-foreground font-medium">
                    {progress.daysUntilExam > 0
                      ? ` — faltam ${progress.daysUntilExam.toLocaleString("pt-BR")} dia(s)`
                      : progress.daysUntilExam === 0
                        ? " — é hoje!"
                        : " — já passou"}
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onRequestRegenerate}>
            <RefreshCw aria-hidden="true" />
            Gerar novo plano
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProgressBar
            value={progress.progressPercent}
            label={`${progress.doneItems.toLocaleString("pt-BR")} de ${progress.totalItems.toLocaleString("pt-BR")} itens concluídos`}
            variant="success"
          />
          <div className="flex flex-wrap items-center gap-2">
            {progress.overdueItems > 0 ? (
              <Badge
                variant="outline"
                className="border-destructive/40 bg-destructive/10 text-destructive gap-1"
              >
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                {progress.overdueItems} item(ns) atrasado(s)
              </Badge>
            ) : null}
            {plan.subjectWeights.map((subject) => (
              <Badge key={subject.subjectId} variant="outline">
                {subject.subjectName} · {formatMinutesAsDuration(subject.weight)}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div
        role="tablist"
        aria-label="Visão do calendário"
        className="border-border inline-flex gap-1 rounded-lg border p-1"
      >
        <Button
          type="button"
          id="plan-week-tab"
          role="tab"
          aria-selected={viewMode === "week"}
          aria-controls="plan-week-panel"
          variant={viewMode === "week" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setViewMode("week")}
        >
          <CalendarRange aria-hidden="true" />
          Semana
        </Button>
        <Button
          type="button"
          id="plan-month-tab"
          role="tab"
          aria-selected={viewMode === "month"}
          aria-controls="plan-month-panel"
          variant={viewMode === "month" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setViewMode("month")}
        >
          <Grid3x3 aria-hidden="true" />
          Mês
        </Button>
      </div>

      {viewMode === "week" ? (
        <section
          id="plan-week-panel"
          role="tabpanel"
          aria-labelledby="plan-week-tab"
          className="space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Semana anterior"
              onClick={() => setWeekStart((current) => addDaysIsoUTC(current, -7))}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <p className="text-muted-foreground text-sm font-medium">
              {formatDayMonth(weekDates[0]!)} – {formatDayMonth(weekDates[6]!)}
              <span className="ml-2">({formatMinutesAsDuration(weekTotalMinutes)})</span>
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Próxima semana"
              onClick={() => setWeekStart((current) => addDaysIsoUTC(current, 7))}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>

          {/* `minmax(170px, 1fr)` por coluna (nunca menos que 170px, largura suficiente para o
             conteúdo do card do dia sem quebrar palavra por letra) + `overflow-x-auto` no
             wrapper: em telas estreitas (mas acima do breakpoint mobile, que empilha em 1
             coluna) rola horizontalmente em vez de espremer as 7 colunas até ficarem
             ilegíveis — telas realmente largas mostram as 7 colunas sem precisar rolar. */}
          <div className="overflow-x-auto pb-1">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(7,minmax(170px,1fr))]">
              {weekDates.map((date) => {
                const day = findDay(currentWeek?.days ?? [], date);
                const items = day?.items ?? [];

                return (
                  <div key={date} className="border-border space-y-2 rounded-lg border p-2.5">
                    <div className="flex items-baseline justify-between gap-1">
                      <p className="text-foreground text-sm font-semibold">
                        {formatWeekdayShort(date)}
                      </p>
                      <p className="text-muted-foreground text-xs">{formatDayMonth(date)}</p>
                    </div>
                    {day && day.totalMinutes > 0 ? (
                      <p className="text-muted-foreground text-xs">
                        {formatMinutesAsDuration(day.totalMinutes)}
                      </p>
                    ) : null}

                    {items.length === 0 ? (
                      <p className="text-muted-foreground py-4 text-center text-xs">Nenhum item</p>
                    ) : (
                      <ul role="list" className="space-y-2">
                        {items.map((item, index) => {
                          const override = doneOverrides[item.id];
                          const displayItem: StudyPlanItemDTO =
                            override !== undefined
                              ? { ...item, status: override ? "DONE" : "PENDING" }
                              : item;

                          return (
                            <PlanItemRow
                              key={item.id}
                              item={displayItem}
                              isFirst={index === 0}
                              isLast={index === items.length - 1}
                              disabled={isMutating}
                              isDragOver={dragSource?.date === date && dragOverIndex === index}
                              onToggleDone={(nextDone) => handleToggleDone(item, nextDone)}
                              onMoveUp={() => day && handleReorder(day, index, index - 1)}
                              onMoveDown={() => day && handleReorder(day, index, index + 1)}
                              onDragStart={(event) => {
                                event.dataTransfer.effectAllowed = "move";
                                event.dataTransfer.setData("text/plain", item.id);
                                handleDragStart(date, index);
                              }}
                              onDragOver={(event) => {
                                if (dragSource?.date !== date) return;
                                event.preventDefault();
                                event.dataTransfer.dropEffect = "move";
                                handleDragOverIndex(date, index);
                              }}
                              onDragLeave={() => setDragOverIndex(null)}
                              onDrop={(event) => {
                                event.preventDefault();
                                if (day) handleDrop(day, index);
                              }}
                              onDragEnd={handleDragEnd}
                            />
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : (
        <section
          id="plan-month-panel"
          role="tabpanel"
          aria-labelledby="plan-month-tab"
          className="space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Mês anterior"
              onClick={() => setMonthKey((current) => shiftMonthKey(current, -1))}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <p className="text-foreground text-sm font-medium">{formatMonthLabel(monthKey)}</p>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Próximo mês"
              onClick={() => setMonthKey((current) => shiftMonthKey(current, 1))}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>

          <div className="overflow-x-auto">
            <div className="grid min-w-[620px] grid-cols-7 gap-1">
              {weekdayHeaderDates.map((date) => (
                <p
                  key={date}
                  className="text-muted-foreground pb-1 text-center text-xs font-medium"
                >
                  {formatWeekdayShort(date)}
                </p>
              ))}
              {monthDates.map((date, index) => {
                if (!date) {
                  return <div key={`blank-${index}`} aria-hidden="true" />;
                }
                const day = findDay(currentMonthGroup?.days ?? [], date);
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => goToWeekOf(date)}
                    className="border-border hover:border-primary hover:bg-primary/5 flex min-h-16 flex-col items-start gap-1 rounded-lg border p-1.5 text-left transition-colors"
                  >
                    <span className="text-foreground text-xs font-medium">{date.slice(8, 10)}</span>
                    {day && day.items.length > 0 ? (
                      <span className="bg-primary/10 text-primary rounded px-1 text-[0.65rem] font-medium">
                        {day.items.length} · {formatMinutesAsDuration(day.totalMinutes)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
