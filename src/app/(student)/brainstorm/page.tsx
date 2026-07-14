import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ErrorState } from "@/components/shared/error-state";
import { BrainstormWorkspace } from "@/components/brainstorm/brainstorm-workspace";
import type { BrainstormBoardDTO } from "@/contracts/brainstorm";
import { getBoardAction, listBoardsAction } from "@/server/actions/brainstorm";
import { listSubjectOptionsAction } from "@/server/actions/simulations";

export const metadata: Metadata = { title: "Brainstorm" };

const BREADCRUMBS = [{ label: "Início", href: "/dashboard" }, { label: "Brainstorm" }];

/**
 * "Brainstorm" (Fase 13 — UI do agente `frontend`, CLAUDE.md §20). Server Component: busca os
 * quadros do aluno (`listBoardsAction`) e carrega o quadro ATIVO — o primeiro da lista;
 * `BrainstormWorkspace` permite trocar entre quadros no cliente sem recarregar a página — via
 * `getBoardAction`, e também a lista de matérias (só para o formulário de cartão). Delega toda a
 * interatividade (colunas, drag-and-drop, formulários, conversões) para `BrainstormWorkspace`.
 *
 * Sem quadro nenhum é um estado legítimo (aluno novo, ainda não criou um quadro) — não é erro;
 * `BrainstormWorkspace` oferece criar o primeiro. Uma falha real de `listBoardsAction`/
 * `getBoardAction`, porém, vira `ErrorState` (mesmo critério de `plano-de-estudos/page.tsx`: o
 * quadro é o dado principal desta página).
 */
export default async function BrainstormPage() {
  const [boardsResult, subjectsResult] = await Promise.all([listBoardsAction(), listSubjectOptionsAction()]);

  if (!boardsResult.ok) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={BREADCRUMBS} />
        <ErrorState
          title="Não foi possível carregar seus quadros de Brainstorm"
          description={boardsResult.error.message}
        />
      </div>
    );
  }

  const boards = boardsResult.data;
  const subjects = subjectsResult.ok ? subjectsResult.data : [];
  const firstBoardId = boards[0]?.id;

  let initialBoard: BrainstormBoardDTO | null = null;
  if (firstBoardId) {
    const boardResult = await getBoardAction({ boardId: firstBoardId });
    if (!boardResult.ok) {
      return (
        <div className="space-y-6">
          <Breadcrumbs items={BREADCRUMBS} />
          <ErrorState title="Não foi possível carregar o quadro" description={boardResult.error.message} />
        </div>
      );
    }
    initialBoard = boardResult.data;
  }

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs items={BREADCRUMBS} />
        <h1 className="text-2xl font-semibold tracking-tight">Brainstorm</h1>
        <p className="text-muted-foreground text-sm">
          Organize ideias, dúvidas e resumos num quadro Kanban — depois converta em flashcard ou em
          tarefa do plano de estudos.
        </p>
      </div>

      <BrainstormWorkspace initialBoards={boards} initialBoard={initialBoard} subjects={subjects} />
    </div>
  );
}
