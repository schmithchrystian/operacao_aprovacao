import type { ReactNode } from "react";
import { CalendarClock, MapPin, Target } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressBar } from "@/components/shared/progress-bar";
import { XpBadge } from "@/components/shared/xp-badge";
import { formatDatePtBr } from "@/lib/utils";
import type { OwnProfileDTO } from "./types";

/**
 * Progresso de XP até o próximo nível — vem de `getUserGamificationAction` (Fase 8, já
 * autorizado), NUNCA calculado aqui: `ProfileAggregatesDTO` não expõe o XP mínimo do nível
 * atual/próximo (`currentLevelXp`/`nextLevelXp`), só o nível já resolvido (índice/nome) — inventar
 * esses limiares no frontend duplicaria a régua de níveis do agente `gamification`
 * (`@/server/services/gamification/levels.ts`), que é quem decide isso (CLAUDE.md — não calcular
 * pontos/regra de gamificação no cliente). `null` é um estado válido (a leitura de gamificação
 * falhou ou está indisponível) — a barra simplesmente não aparece, o nível/XP normal (vindos de
 * `ProfileAggregatesDTO`, sempre disponíveis) continuam sendo exibidos.
 */
export interface ProfileXpProgress {
  levelIndex: number;
  levelName: string;
  xp: number;
  /** 0–100 dentro da faixa do nível atual; já vem pronto de `ComputedLevel.progressPercent`. */
  progressPercent: number;
  /** `null` no nível máximo (sem "próximo nível" a caminho). */
  xpToNextLevel: number | null;
}

interface ProfileHeaderProps {
  profile: OwnProfileDTO;
  xpProgress: ProfileXpProgress | null;
  /**
   * Dias corridos até `profile.examDate` (pode ser negativo — prova já passou), calculado pela
   * página (Server Component) com o relógio do SERVIDOR (`diffCalendarDaysUtc`, `@/lib/utils`) —
   * nunca `new Date()` aqui dentro: este componente é renderizado a partir de `ProfileWorkspace`
   * (Client), então um cálculo local usaria o relógio do NAVEGADOR (CLAUDE.md §14, "não confiar
   * no relógio do cliente"). Cosmético (contagem regressiva), mas ainda assim resolvido no
   * servidor por consistência com o resto do app (`study-plan-calendar.tsx`/dashboard). `null`
   * quando `profile.examDate` também é `null` (sem plano de estudos ativo).
   */
  daysUntilExam: number | null;
  /** Botão "Editar perfil" (Client, dono do dialog) — este componente só reserva o espaço. */
  actions?: ReactNode;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0];
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : undefined;
  const initials = `${first ?? ""}${last ?? ""}`.toUpperCase();
  return initials || "?";
}

/** Mesma convenção de rótulo de `study-plan-calendar.tsx` ("Prova em X — faltam N dia(s)"). */
function describeExamCountdown(examDateIso: string, daysUntil: number): string {
  const dateLabel = formatDatePtBr(examDateIso);

  if (daysUntil > 0) return `Prova em ${dateLabel} — faltam ${daysUntil.toLocaleString("pt-BR")} dia(s)`;
  if (daysUntil === 0) return `Prova em ${dateLabel} — é hoje!`;
  return `Prova em ${dateLabel} — já passou`;
}

/**
 * Cabeçalho de "Meu perfil" (Fase 16 — UI do agente `frontend`): avatar, nome, cidade/estado,
 * concurso principal, contagem regressiva da prova, nível + XP. Componente apresentacional puro
 * (sem `"use client"` própria) renderizado a partir de `ProfileWorkspace` — precisa reagir ao
 * estado do perfil após uma edição, por isso vive do lado do cliente (mesmo motivo de
 * `StudyPlanCalendar`: o dado por baixo é dono do estado no cliente, não uma leitura única de
 * servidor).
 */
export function ProfileHeader({ profile, xpProgress, daysUntilExam, actions }: ProfileHeaderProps) {
  const displayName = profile.name ?? "Aluno";
  const locationLabel = [profile.city, profile.state].filter(Boolean).join(" — ");
  const levelIndex = xpProgress?.levelIndex ?? profile.aggregates.level.index;
  const levelName = xpProgress?.levelName ?? profile.aggregates.level.name;
  const xp = xpProgress?.xp ?? profile.aggregates.xp;

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <Avatar size="lg" className="size-20 shrink-0 text-2xl">
          {profile.avatarUrl ? <AvatarImage src={profile.avatarUrl} alt="" /> : null}
          <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight break-words">{displayName}</h1>
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                {locationLabel ? (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    {locationLabel}
                  </span>
                ) : null}
                {profile.mainContest ? (
                  <span className="flex items-center gap-1">
                    <Target className="h-3.5 w-3.5" aria-hidden="true" />
                    {profile.mainContest.contestName}
                  </span>
                ) : null}
              </div>
              {profile.bio ? <p className="text-foreground/90 max-w-prose text-sm">{profile.bio}</p> : null}
            </div>
            {actions}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              Nível {levelIndex} — {levelName}
            </Badge>
            <XpBadge value={xp} />
          </div>

          {xpProgress ? (
            xpProgress.xpToNextLevel !== null ? (
              <ProgressBar
                value={xpProgress.progressPercent}
                label={`Faltam ${xpProgress.xpToNextLevel.toLocaleString("pt-BR")} XP para o próximo nível`}
                variant="success"
                className="max-w-sm"
              />
            ) : (
              <p className="text-muted-foreground text-xs">Nível máximo atingido — continue estudando para se manter no topo.</p>
            )
          ) : null}

          {profile.examDate && daysUntilExam !== null ? (
            <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
              {describeExamCountdown(profile.examDate, daysUntilExam)}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
