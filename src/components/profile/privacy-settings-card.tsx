"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { PrivacySettingsDTO, UpdatePrivacySettingsInput } from "@/contracts/profile";
import { updatePrivacyAction } from "@/server/actions/profile";
import { isOwnProfileComplete, type OwnProfileDTO } from "./types";

interface PrivacySettingsCardProps {
  privacy: PrivacySettingsDTO;
  onUpdated: (profile: OwnProfileDTO) => void;
}

type PrivacyFlagKey = keyof PrivacySettingsDTO;

interface PrivacyFieldConfig {
  key: PrivacyFlagKey;
  label: string;
  description: string;
}

/**
 * Uma entrada por flag (Fase 16 — UI do agente `frontend`). Descrições escritas para deixar
 * explícito o EFEITO de cada uma (o dono sempre continua vendo tudo — o que muda é o que um
 * VISITANTE vê, `@/server/services/profile/read.ts#getPublicProfile`), nunca o mecanismo interno.
 */
const PRIVACY_FIELDS: readonly PrivacyFieldConfig[] = [
  {
    key: "isProfilePublic",
    label: "Perfil público",
    description:
      "Interruptor principal. Desativado, seu perfil fica fechado para todo mundo, exceto você — as preferências abaixo só têm efeito com o perfil público.",
  },
  {
    key: "showRealName",
    label: "Mostrar meu nome real",
    description: "Desativado, seu nome aparece anonimizado para visitantes (mesmo padrão usado no ranking).",
  },
  {
    key: "showCityState",
    label: "Mostrar cidade e estado",
    description: "Desativado, sua cidade e estado ficam ocultos para quem visita seu perfil.",
  },
  {
    key: "showStudyHours",
    label: "Mostrar horas de estudo e progresso",
    description: "Controla horas estudadas, aulas concluídas e simulados realizados exibidos para visitantes.",
  },
  {
    key: "showPerformance",
    label: "Mostrar desempenho em simulados",
    description: "Controla a média de acertos em simulados exibida para visitantes.",
  },
  {
    key: "showInRanking",
    label: "Aparecer no ranking",
    description: "Desativado, sua posição some da visão pública do ranking — você continua vendo a sua normalmente.",
  },
];

/** Constrói a entrada parcial de `updatePrivacyAction` explicitamente por `switch` (em vez de um
 *  objeto com chave computada `{ [key]: value }`) — mais claro e evita depender de como o
 *  TypeScript infere o tipo de uma propriedade computada sobre uma união de literais; o `switch`
 *  exaustivo sobre `PrivacyFlagKey` também garante, em tempo de compilação, que uma eventual
 *  nova flag em `PrivacySettingsDTO` não fique esquecida aqui. */
function buildPrivacyPatch(key: PrivacyFlagKey, value: boolean): UpdatePrivacySettingsInput {
  switch (key) {
    case "isProfilePublic":
      return { isProfilePublic: value };
    case "showRealName":
      return { showRealName: value };
    case "showCityState":
      return { showCityState: value };
    case "showStudyHours":
      return { showStudyHours: value };
    case "showPerformance":
      return { showPerformance: value };
    case "showInRanking":
      return { showInRanking: value };
  }
}

/**
 * Configurações de privacidade (Fase 16 — UI do agente `frontend`). REGRA DURA (CLAUDE.md
 * §11/§24): a privacidade é aplicada SEMPRE no backend (`@/server/services/profile`) — esta seção
 * só reflete/edita as flags, nunca decide sozinha o que esconder. Cada switch salva
 * IMEDIATAMENTE ao ser alternado (uma chamada de `updatePrivacyAction` por flag, entrada parcial
 * — `updatePrivacySettingsInputSchema` aceita um subconjunto das flags e preserva as demais)
 * em vez de um botão "Salvar" único: mais direto para preferências binárias, e evita o estado
 * "alterei mas esqueci de salvar" numa tela de privacidade.
 *
 * Cada `Switch` é CONTROLADO por `privacy[key]` (prop do pai) — nunca otimista: só reflete o novo
 * valor depois que `onUpdated` substitui o estado no pai com o `ProfileDTO` fresco devolvido pela
 * action. Numa configuração de privacidade, "parece que salvou mas não salvou" é pior do que uma
 * resposta um pouco mais lenta.
 */
export function PrivacySettingsCard({ privacy, onUpdated }: PrivacySettingsCardProps) {
  const [pendingField, setPendingField] = useState<PrivacyFlagKey | null>(null);

  function handleToggle(key: PrivacyFlagKey, checked: boolean) {
    setPendingField(key);

    const input = buildPrivacyPatch(key, checked);

    void (async () => {
      const result = await updatePrivacyAction(input);
      setPendingField(null);

      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      if (!isOwnProfileComplete(result.data)) {
        toast.error("Preferência salva, mas a resposta veio incompleta. Recarregue a página.");
        return;
      }

      toast.success("Preferência de privacidade atualizada.");
      onUpdated(result.data);
    })();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacidade</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {!privacy.isProfilePublic ? (
          <p className="border-border bg-muted/40 text-muted-foreground mb-2 flex items-start gap-2 rounded-lg border p-3 text-xs">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Seu perfil está fechado — as preferências abaixo só passam a valer quando você ativar “Perfil público”.
          </p>
        ) : null}

        <ul className="divide-border divide-y">
          {PRIVACY_FIELDS.map((field) => {
            const checked = privacy[field.key];
            const isPending = pendingField === field.key;
            const switchId = `privacy-${field.key}`;

            return (
              <li key={field.key} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 space-y-0.5">
                  <Label htmlFor={switchId} className="text-sm font-medium">
                    {field.label}
                  </Label>
                  <p className="text-muted-foreground text-xs">{field.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2" aria-busy={isPending}>
                  <span className="text-muted-foreground w-16 shrink-0 text-right text-xs font-medium">
                    {checked ? "Ativado" : "Desativado"}
                  </span>
                  <Switch
                    id={switchId}
                    checked={checked}
                    disabled={isPending}
                    onCheckedChange={(next) => handleToggle(field.key, next)}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
