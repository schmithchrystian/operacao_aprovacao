"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileWarning, NotebookText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DeckDTO, RetentionStatsDTO } from "@/contracts/flashcards";
import type { SubjectOptionDTO } from "@/contracts/simulations";
import {
  createFromErrorsAction,
  createFromNotesAction,
  getRetentionStatsAction,
  listDecksAction,
} from "@/server/actions/flashcards";
import { CardFormDialog } from "./card-form-dialog";
import { CreateDeckDialog } from "./create-deck-dialog";
import { DeckList } from "./deck-list";
import { GenerateFromSourceButton } from "./generate-from-source-button";
import { pluralizeCartao } from "./labels";
import { RetentionPanel } from "./retention-panel";

interface FlashcardsWorkspaceProps {
  initialDecks: DeckDTO[];
  initialRetention: RetentionStatsDTO | null;
  subjects: SubjectOptionDTO[];
}

/**
 * Orquestrador client-side do hub de Flashcards (Fase 14 — UI do agente `frontend`). Mesmo papel
 * de `BrainstormWorkspace`/`StudyPlanWorkspace`: recebe os dados iniciais já resolvidos pelo
 * Server Component (`listDecksAction`/`getRetentionStatsAction`) e passa a possuir esse estado no
 * cliente.
 *
 * Decisão (diferente de `BrainstormWorkspace`, que faz patch local a partir do DTO devolvido por
 * cada ação): toda mutação aqui (criar baralho, criar cartão, gerar de erros/anotações) dispara
 * um REFETCH de `listDecksAction`/`getRetentionStatsAction` em vez de atualizar
 * `cardCount`/`dueCount`/retenção manualmente no cliente. Motivo: nem `createCardAction`
 * (devolve o CARTÃO, não o baralho) nem `createFromErrorsAction`/`createFromNotesAction`
 * (devolvem os CARTÕES do baralho, não suas contagens) trazem o `DeckDTO` atualizado pronto — e
 * reimplementar a ORDENAÇÃO por tipo (`TYPE_ORDER`, `@/server/services/flashcards/list-decks.ts`)
 * ou as contagens aqui seria duplicar regra que já existe no backend (CLAUDE.md — "não calcule
 * regra crítica no frontend"). Custo desprezível (poucas dezenas de baralhos/cartões por aluno).
 */
export function FlashcardsWorkspace({ initialDecks, initialRetention, subjects }: FlashcardsWorkspaceProps) {
  const [decks, setDecks] = useState(initialDecks);
  const [retention, setRetention] = useState(initialRetention);
  const [isCardDialogOpen, setIsCardDialogOpen] = useState(false);

  // Baralhos elegíveis para receber um cartão novo — nunca um baralho de matéria (conteúdo do
  // sistema) nem o "Favoritos" sintetizado (não é um baralho real, `@/contracts/flashcards`).
  const ownedDecks = decks.filter((deck) => deck.type !== "SUBJECT" && deck.type !== "FAVORITES");

  async function refreshAll() {
    const [decksResult, retentionResult] = await Promise.all([listDecksAction(), getRetentionStatsAction()]);

    if (decksResult.ok) {
      setDecks(decksResult.data);
    } else {
      toast.error(decksResult.error.message);
    }
    if (retentionResult.ok) {
      setRetention(retentionResult.data);
    }
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="flashcards-acoes" className="space-y-3">
        <h2 id="flashcards-acoes" className="sr-only">
          Ações
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <CreateDeckDialog subjects={subjects} onCreated={() => void refreshAll()} />

          {ownedDecks.length > 0 ? (
            <Button type="button" variant="outline" onClick={() => setIsCardDialogOpen(true)}>
              <Plus aria-hidden="true" />
              Criar cartão
            </Button>
          ) : (
            <span className="text-muted-foreground text-xs">Crie um baralho para poder adicionar cartões.</span>
          )}

          <GenerateFromSourceButton
            label="Gerar de erros"
            pendingLabel="Gerando..."
            icon={FileWarning}
            action={createFromErrorsAction}
            describeResult={(count) =>
              count > 0
                ? `Baralho "Criados do caderno de erros" com ${count} ${pluralizeCartao(count)} no total.`
                : "Nenhuma questão errada para importar ainda."
            }
            onGenerated={() => void refreshAll()}
          />
          <GenerateFromSourceButton
            label="Gerar de anotações"
            pendingLabel="Gerando..."
            icon={NotebookText}
            action={createFromNotesAction}
            describeResult={(count) =>
              count > 0
                ? `Baralho "Criados de anotações" com ${count} ${pluralizeCartao(count)} no total.`
                : "Nenhuma anotação para importar ainda."
            }
            onGenerated={() => void refreshAll()}
          />
        </div>

        <CardFormDialog
          open={isCardDialogOpen}
          onOpenChange={setIsCardDialogOpen}
          decks={ownedDecks}
          subjects={subjects}
          onCreated={() => void refreshAll()}
        />
      </section>

      {retention ? (
        <RetentionPanel stats={retention} />
      ) : (
        <p className="text-muted-foreground text-xs">Não foi possível carregar as estatísticas de retenção agora.</p>
      )}

      <section aria-labelledby="flashcards-baralhos" className="space-y-3">
        <h2 id="flashcards-baralhos" className="text-lg font-semibold tracking-tight">
          Seus baralhos
        </h2>
        <DeckList decks={decks} />
      </section>
    </div>
  );
}
