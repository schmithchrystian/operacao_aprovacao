"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { StudyMissionDTO } from "@/contracts/study-session";
import { Button } from "@/components/ui/button";
import { advanceMyMissionAction } from "@/server/actions/missions";
import { SessionBlockList } from "./session-block-list";
export function MissionRunner({ initialMission }: { initialMission: StudyMissionDTO }) {
  const [mission, setMission] = useState(initialMission);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const block = mission.blocks[mission.currentBlockIndex];
  function advance() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await advanceMyMissionAction({
          id: mission.id,
          expectedBlockIndex: mission.currentBlockIndex,
        });
        if (result.ok) setMission(result.data);
        else setError(result.error.message);
      } catch {
        setError("Não foi possível salvar seu progresso. Tente novamente.");
      }
    });
  }
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        {mission.totalMinutes} minutos planejados · {mission.blocks.length} blocos
      </p>
      {mission.status === "FINISHED" ? (
        <p role="status" className="text-lg font-medium">
          Missão concluída.
        </p>
      ) : mission.status === "DISCARDED" ? (
        <p>Missão encerrada.</p>
      ) : block ? (
        <section className="space-y-3 rounded border p-4">
          <h2 className="text-lg font-semibold">
            Bloco {mission.currentBlockIndex + 1}: {block.title}
          </h2>
          <p>{block.minutes} minutos planejados</p>
          {block.contentRef?.href ? (
            <Link
              className="text-primary inline-block underline"
              href={block.contentRef.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir conteúdo em outra aba
            </Link>
          ) : (
            <p className="text-muted-foreground text-sm">
              Realize este bloco com seu material de estudo.
            </p>
          )}
          <div>
            <Button disabled={pending} onClick={advance}>
              {pending
                ? "Salvando…"
                : mission.currentBlockIndex + 1 === mission.blocks.length
                  ? "Concluir missão"
                  : "Concluir bloco e avançar"}
            </Button>
          </div>
        </section>
      ) : (
        <p>Nenhum bloco disponível.</p>
      )}
      {error ? (
        <div role="alert">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" onClick={() => router.refresh()}>
            Atualizar missão
          </Button>
        </div>
      ) : null}
      <SessionBlockList
        blocks={mission.blocks}
        currentBlockIndex={
          mission.status === "FINISHED" ? mission.blocks.length : mission.currentBlockIndex
        }
      />
      <Link className="text-primary underline" href="/missoes">
        Ver minhas missões
      </Link>
    </div>
  );
}
