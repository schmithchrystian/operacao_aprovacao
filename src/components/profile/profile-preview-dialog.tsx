"use client";

import { useState } from "react";
import { Eye, Lock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProfileDTO } from "@/contracts/profile";
import { getPublicProfileAction } from "@/server/actions/profile";
import type { OwnProfileDTO } from "./types";

interface ProfilePreviewDialogProps {
  profile: OwnProfileDTO;
}

/**
 * Rótulo para um campo `null` na visão pública. Deliberadamente neutro ("não disponível", nunca
 * "oculto pela privacidade"): `getPublicProfileAction` devolve `null` tanto quando uma flag de
 * privacidade mascara o campo quanto quando o dado simplesmente ainda não existe (ex.:
 * `rankingPosition` sem `RankingScore` calculado — nada a ver com `showInRanking`); o DTO não
 * distingue os dois casos, então a legenda não deveria afirmar uma causa que pode estar errada.
 */
const HIDDEN_LABEL = "Não disponível";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0];
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : undefined;
  const initials = `${first ?? ""}${last ?? ""}`.toUpperCase();
  return initials || "?";
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={value === HIDDEN_LABEL ? "text-muted-foreground text-right text-xs italic" : "text-right font-medium"}>
        {value}
      </span>
    </div>
  );
}

/**
 * Prévia "como outros veem meu perfil" (Fase 16 — UI do agente `frontend`, item opcional).
 * Busca sob demanda (só quando o dialog abre, não no carregamento da página) via
 * `getPublicProfileAction({ targetUserId: meu próprio id, previewAsVisitor: true })`. O flag
 * `previewAsVisitor` (achado M1 da revisão de segurança) faz o servidor aplicar a MESMA máscara
 * de visitante ao próprio perfil, em vez de devolver a visão completa do dono — sem ele, a
 * prévia mostraria dados que deveriam estar mascarados. O resultado é sempre fiel à regra real
 * do servidor (nunca uma simulação local das flags). Simples de propósito: sem cache entre
 * aberturas, sem refazer a busca automaticamente quando `profile` muda.
 */
export function ProfilePreviewDialog({ profile }: ProfilePreviewDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<ProfileDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadPreview() {
    setIsLoading(true);
    setError(null);
    const result = await getPublicProfileAction({ targetUserId: profile.userId, previewAsVisitor: true });
    setIsLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setPreview(result.data);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void loadPreview();
      }}
    >
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        <Eye aria-hidden="true" />
        Ver como outros veem
      </DialogTrigger>
      <DialogContent aria-describedby="profile-preview-description">
        <DialogHeader>
          <DialogTitle>Como outros veem seu perfil</DialogTitle>
          <DialogDescription id="profile-preview-description">
            Exatamente o que um outro aluno vê ao abrir seu perfil, já considerando suas preferências de privacidade
            atuais.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2" aria-hidden="true">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : preview && !preview.isPublic ? (
          <div className="border-border bg-muted/40 flex items-start gap-2 rounded-lg border p-3 text-sm">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              Seu perfil está fechado (<span className="font-medium">Perfil público</span> desativado): visitantes não
              veem nenhuma informação, só que o perfil existe.
            </p>
          </div>
        ) : preview ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar size="lg">
                {preview.avatarUrl ? <AvatarImage src={preview.avatarUrl} alt="" /> : null}
                <AvatarFallback>{getInitials(preview.name ?? "?")}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-medium">{preview.name}</p>
                {preview.mainContest ? (
                  <p className="text-muted-foreground truncate text-xs">{preview.mainContest.contestName}</p>
                ) : null}
              </div>
            </div>

            <div className="divide-border divide-y">
              <PreviewRow label="Cidade/Estado" value={[preview.city, preview.state].filter(Boolean).join(" — ") || HIDDEN_LABEL} />
              <PreviewRow
                label="Nível"
                value={preview.aggregates ? `${preview.aggregates.level.index} — ${preview.aggregates.level.name}` : HIDDEN_LABEL}
              />
              <PreviewRow label="Pontos" value={preview.aggregates ? preview.aggregates.points.toLocaleString("pt-BR") : HIDDEN_LABEL} />
              <PreviewRow
                label="Posição no ranking"
                value={
                  preview.aggregates?.rankingPosition !== undefined && preview.aggregates?.rankingPosition !== null
                    ? `#${preview.aggregates.rankingPosition.toLocaleString("pt-BR")}`
                    : HIDDEN_LABEL
                }
              />
              <PreviewRow
                label="Horas de estudo"
                value={
                  preview.aggregates?.studyHours !== undefined && preview.aggregates?.studyHours !== null
                    ? `${preview.aggregates.studyHours.toLocaleString("pt-BR")}h`
                    : HIDDEN_LABEL
                }
              />
              <PreviewRow
                label="Média em simulados"
                value={
                  preview.aggregates?.averageMockExamScorePercent !== undefined &&
                  preview.aggregates?.averageMockExamScorePercent !== null
                    ? `${Math.round(preview.aggregates.averageMockExamScorePercent)}%`
                    : HIDDEN_LABEL
                }
              />
              <PreviewRow
                label="Conquistas"
                value={
                  preview.aggregates
                    ? `${preview.aggregates.achievementsUnlockedCount}/${preview.aggregates.achievementsTotalCount}`
                    : HIDDEN_LABEL
                }
              />
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
