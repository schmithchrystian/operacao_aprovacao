import { Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import type { BrainstormBoardDTO, BrainstormCardDTO } from "@/contracts/brainstorm";
import { CARD_TYPE_ICON } from "./labels";

interface BrainstormMapProps {
  board: BrainstormBoardDTO;
}

interface SubjectGroup {
  key: string;
  subjectName: string | null;
  cards: BrainstormCardDTO[];
}

function groupCardsBySubject(board: BrainstormBoardDTO): SubjectGroup[] {
  const groups = new Map<string, SubjectGroup>();

  for (const column of board.columns) {
    for (const card of column.cards) {
      const key = card.subjectId ?? "__sem-materia__";
      const existing = groups.get(key);
      if (existing) {
        existing.cards.push(card);
      } else {
        groups.set(key, { key, subjectName: card.subjectName, cards: [card] });
      }
    }
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.subjectName === null) return 1;
    if (b.subjectName === null) return -1;
    return a.subjectName.localeCompare(b.subjectName, "pt-BR");
  });
}

/**
 * "Mapa livre" simplificado (Fase 13 — UI do agente `frontend`, CLAUDE.md §20). O quadro Kanban
 * já cobre colunas/drag-and-drop/conversões; esta aba dá uma visão COMPLEMENTAR "por tema",
 * agrupando visualmente TODOS os cartões do quadro (das 5 colunas, independente da coluna/status
 * atual) por matéria — dentro de cada matéria, o assunto e as tags de cada cartão ficam visíveis.
 *
 * Deliberadamente NÃO implementa um canvas livre com posicionamento/conexões arrastáveis (custo
 * alto para o valor desta fase) — decisão registrada no retorno da tarefa como pendência para uma
 * etapa futura. Puramente apresentacional (Server-safe, sem hooks): os dados já vêm prontos do
 * `BrainstormBoardDTO` resolvido pelo servidor.
 */
export function BrainstormMap({ board }: BrainstormMapProps) {
  const totalCards = board.columns.reduce((total, column) => total + column.cards.length, 0);

  if (totalCards === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="Nenhum cartão para mapear ainda"
        description="Crie cartões no quadro Kanban — eles aparecem aqui agrupados por matéria."
      />
    );
  }

  const groups = groupCardsBySubject(board);

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-xs">
        Versão inicial do mapa livre: cartões agrupados por matéria (todas as colunas). Conexões
        arrastáveis livremente por posição chegam numa etapa futura.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <div key={group.key} className="border-border bg-card/40 rounded-lg border p-3">
            <h3 className="text-foreground mb-2 text-sm font-semibold">
              {group.subjectName ?? "Sem matéria"}
              <span className="text-muted-foreground ml-1.5 font-normal">({group.cards.length})</span>
            </h3>
            <ul className="border-border space-y-2 border-l-2 pl-3">
              {group.cards.map((card) => {
                const TypeIcon = CARD_TYPE_ICON[card.type];
                return (
                  <li key={card.id} className="relative">
                    <span
                      className="bg-border absolute top-1.5 -left-[15px] h-1.5 w-1.5 rounded-full"
                      aria-hidden="true"
                    />
                    <p className="flex items-center gap-1.5 text-sm font-medium break-words">
                      <TypeIcon className="text-muted-foreground h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {card.title}
                    </p>
                    {card.topicName ? <p className="text-muted-foreground text-xs">{card.topicName}</p> : null}
                    {card.tags.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {card.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[0.65rem]">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
