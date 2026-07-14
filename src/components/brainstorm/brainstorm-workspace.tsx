"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Kanban, Lightbulb, Map as MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { BrainstormBoardDTO, BrainstormBoardSummaryDTO } from "@/contracts/brainstorm";
import type { SubjectOptionDTO } from "@/contracts/simulations";
import { getBoardAction } from "@/server/actions/brainstorm";
import { BrainstormMap } from "./brainstorm-map";
import { CreateBoardDialog } from "./create-board-dialog";
import { KanbanBoard } from "./kanban-board";

interface BrainstormWorkspaceProps {
  initialBoards: BrainstormBoardSummaryDTO[];
  initialBoard: BrainstormBoardDTO | null;
  subjects: SubjectOptionDTO[];
}

type ViewMode = "board" | "map";

function toSummary(board: BrainstormBoardDTO): BrainstormBoardSummaryDTO {
  const cardCount = board.columns.reduce((total, column) => total + column.cards.length, 0);
  return {
    id: board.id,
    title: board.title,
    columnCount: board.columns.length,
    cardCount,
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
  };
}

/**
 * Orquestrador client-side do Brainstorm (Fase 13 — UI do agente `frontend`, mesmo padrão de
 * `StudyPlanWorkspace`, `@/components/study-plan/study-plan-workspace.tsx`): recebe os quadros
 * (resumo) e o quadro ATIVO já resolvidos pelo Server Component (`listBoardsAction`/
 * `getBoardAction`) e passa a possuir esse estado no cliente.
 *
 * Sem quadro nenhum (aluno novo) é um estado legítimo, não um erro — oferece criar o primeiro
 * (`CreateBoardDialog`, sempre com as 5 colunas padrão vindas do backend). Com quadro, alterna
 * entre o quadro Kanban e o "mapa livre" simplificado, e permite trocar de quadro (quando há mais
 * de um) sem recarregar a página.
 */
export function BrainstormWorkspace({ initialBoards, initialBoard, subjects }: BrainstormWorkspaceProps) {
  const [boards, setBoards] = useState(initialBoards);
  const [board, setBoard] = useState(initialBoard);
  const [isSwitchingBoard, setIsSwitchingBoard] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("board");

  async function handleSwitchBoard(boardId: string) {
    if (boardId === board?.id) return;
    setIsSwitchingBoard(true);
    const result = await getBoardAction({ boardId });
    setIsSwitchingBoard(false);

    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    setBoard(result.data);
  }

  function handleBoardCreated(created: BrainstormBoardDTO) {
    setBoards((current) => [...current, toSummary(created)]);
    setBoard(created);
    setViewMode("board");
  }

  if (!board) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={Lightbulb}
            title="Nenhum quadro de Brainstorm ainda"
            description="Crie seu primeiro quadro — ele já vem com as colunas Ideias, Estudar, Revisar, Dúvidas e Resolvido."
            action={<CreateBoardDialog onCreated={handleBoardCreated} triggerVariant="default" />}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          {boards.length > 1 ? (
            <div className="space-y-1.5">
              <Label htmlFor="brainstorm-board-switcher" className="text-xs">
                Quadro
              </Label>
              <NativeSelect
                id="brainstorm-board-switcher"
                className="w-56"
                value={board.id}
                disabled={isSwitchingBoard}
                onChange={(event) => void handleSwitchBoard(event.target.value)}
              >
                {boards.map((summary) => (
                  <option key={summary.id} value={summary.id}>
                    {summary.title}
                  </option>
                ))}
              </NativeSelect>
            </div>
          ) : (
            <h2 className="text-lg font-semibold">{board.title}</h2>
          )}

          <div
            role="tablist"
            aria-label="Visão do Brainstorm"
            className="border-border inline-flex gap-1 rounded-lg border p-1"
          >
            <Button
              type="button"
              id="brainstorm-board-tab"
              role="tab"
              aria-selected={viewMode === "board"}
              aria-controls="brainstorm-board-panel"
              variant={viewMode === "board" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("board")}
            >
              <Kanban aria-hidden="true" />
              Quadro
            </Button>
            <Button
              type="button"
              id="brainstorm-map-tab"
              role="tab"
              aria-selected={viewMode === "map"}
              aria-controls="brainstorm-map-panel"
              variant={viewMode === "map" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("map")}
            >
              <MapIcon aria-hidden="true" />
              Mapa
            </Button>
          </div>
        </div>

        <CreateBoardDialog onCreated={handleBoardCreated} />
      </div>

      {viewMode === "board" ? (
        <section id="brainstorm-board-panel" role="tabpanel" aria-labelledby="brainstorm-board-tab">
          <KanbanBoard board={board} subjects={subjects} onBoardChanged={setBoard} />
        </section>
      ) : (
        <section id="brainstorm-map-panel" role="tabpanel" aria-labelledby="brainstorm-map-tab">
          <BrainstormMap board={board} />
        </section>
      )}
    </div>
  );
}
