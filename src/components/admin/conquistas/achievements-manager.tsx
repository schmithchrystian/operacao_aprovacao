"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Archive, Medal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ICON_ALLOWLIST, FALLBACK_ICON } from "@/components/shared/lucide-icon";
import type { AdminAchievementDTO } from "@/contracts/admin-content";
import { archiveAchievementForAdminAction } from "@/server/actions/admin/achievements";
import { CreateAchievementDialog } from "./create-achievement-dialog";
import { EditAchievementDialog } from "./edit-achievement-dialog";

interface AchievementsManagerProps {
  initialAchievements: AdminAchievementDTO[];
  isAdmin: boolean;
}

/** Gestão de conquistas (Fase 17 — caminho vertical priorizado). */
export function AchievementsManager({ initialAchievements, isAdmin }: AchievementsManagerProps) {
  const [achievements, setAchievements] = useState(initialAchievements);

  const handleArchive = async (achievement: AdminAchievementDTO): Promise<boolean> => {
    const result = await archiveAchievementForAdminAction({ id: achievement.id, confirm: true });
    if (!result.ok) {
      toast.error(result.error.message);
      return false;
    }
    setAchievements((prev) => prev.map((a) => (a.id === result.data.id ? result.data : a)));
    toast.success("Conquista arquivada.");
    return true;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Conquistas</h1>
          <p className="text-muted-foreground text-sm">Medalhas e recompensas de gamificação.</p>
        </div>
        <CreateAchievementDialog onCreated={(achievement) => setAchievements((prev) => [achievement, ...prev])} />
      </div>

      {achievements.length === 0 ? (
        <EmptyState icon={Medal} title="Nenhuma conquista cadastrada" description="Crie a primeira conquista acima." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Conquista</TableHead>
              <TableHead>Chave</TableHead>
              <TableHead>Pontos</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {achievements.map((achievement) => {
              const isDeleted = Boolean(achievement.deletedAt);
              const Icon = (achievement.icon && ICON_ALLOWLIST[achievement.icon]) || FALLBACK_ICON;
              return (
                <TableRow key={achievement.id} className={isDeleted ? "opacity-60" : undefined}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="bg-muted text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="font-medium">
                          {achievement.name}
                          {isDeleted ? <span className="text-destructive ml-2 text-xs">(excluída)</span> : null}
                        </p>
                        {achievement.description ? (
                          <p className="text-muted-foreground line-clamp-1 text-xs">{achievement.description}</p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{achievement.key}</TableCell>
                  <TableCell className="text-muted-foreground">{achievement.points}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {!isDeleted ? (
                        <EditAchievementDialog
                          achievement={achievement}
                          onSaved={(updated) => setAchievements((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))}
                        />
                      ) : null}
                      {isAdmin && !isDeleted ? (
                        <ConfirmDialog
                          render={<Button type="button" variant="destructive" size="sm" />}
                          title="Arquivar conquista"
                          description={`Isso arquiva "${achievement.name}". Confirma?`}
                          confirmLabel="Arquivar"
                          destructive
                          onConfirm={() => handleArchive(achievement)}
                        >
                          <Archive aria-hidden="true" />
                          Arquivar
                        </ConfirmDialog>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
