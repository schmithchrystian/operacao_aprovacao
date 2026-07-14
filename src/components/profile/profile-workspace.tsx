"use client";

import { useState } from "react";
import { EditProfileDialog, type ContestOption } from "./edit-profile-dialog";
import { ProfileAchievements } from "./profile-achievements";
import { ProfileContests } from "./profile-contests";
import { ProfileHeader, type ProfileXpProgress } from "./profile-header";
import { ProfilePreviewDialog } from "./profile-preview-dialog";
import { ProfileStats } from "./profile-stats";
import { PrivacySettingsCard } from "./privacy-settings-card";
import type { OwnProfileDTO } from "./types";

interface ProfileWorkspaceProps {
  initialProfile: OwnProfileDTO;
  xpProgress: ProfileXpProgress | null;
  daysUntilExam: number | null;
  contestOptions: ContestOption[];
}

/**
 * Orquestrador client-side de "Meu perfil" (Fase 16 — UI do agente `frontend`). Mesmo papel de
 * `StudyPlanWorkspace`/`FlashcardsWorkspace`: recebe o `ProfileDTO` inicial já resolvido pelo
 * Server Component (`getOwnProfileAction`) e passa a possuir esse estado no cliente — tanto
 * `updateProfileAction` quanto `updatePrivacyAction` já devolvem o `ProfileDTO` COMPLETO e
 * atualizado, então cada mutação faz um patch local direto (`setProfile`) em vez de um
 * `router.refresh()`.
 *
 * `xpProgress`/`daysUntilExam` são calculados uma única vez pela página (Server Component, no
 * momento do request) e não mudam com as mutações desta tela (editar perfil/privacidade não
 * altera XP nem a data da prova) — passados como props estáveis, não fazem parte do estado.
 */
export function ProfileWorkspace({ initialProfile, xpProgress, daysUntilExam, contestOptions }: ProfileWorkspaceProps) {
  const [profile, setProfile] = useState(initialProfile);

  return (
    <div className="space-y-6">
      <ProfileHeader
        profile={profile}
        xpProgress={xpProgress}
        daysUntilExam={daysUntilExam}
        actions={
          <div className="flex flex-wrap gap-2">
            <ProfilePreviewDialog profile={profile} />
            <EditProfileDialog profile={profile} contestOptions={contestOptions} onUpdated={setProfile} />
          </div>
        }
      />

      <ProfileStats profile={profile} />

      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileContests profile={profile} />
        <ProfileAchievements profile={profile} />
      </div>

      <PrivacySettingsCard privacy={profile.privacy} onUpdated={setProfile} />
    </div>
  );
}
