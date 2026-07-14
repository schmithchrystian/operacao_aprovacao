"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { FavoriteToggleButton } from "@/components/simulations/favorite-toggle-button";
import { DIFFICULTY_BADGE_CLASS, DIFFICULTY_LABEL } from "@/components/simulations/labels";
import type { FavoriteQuestionDTO } from "@/contracts/simulations";

interface FavoritesListProps {
  items: FavoriteQuestionDTO[];
}

/**
 * Lista de questões favoritadas. Client Component: ao desfavoritar
 * (`FavoriteToggleButton.onToggled`), remove o item da tela imediatamente em vez de esperar um
 * `router.refresh()` — a fonte de verdade continua sendo `toggleFavoriteAction`.
 */
export function FavoritesList({ items }: FavoritesListProps) {
  const [visibleIds, setVisibleIds] = useState(() => new Set(items.map((item) => item.questionId)));
  const visibleItems = items.filter((item) => visibleIds.has(item.questionId));

  if (visibleItems.length === 0) {
    return (
      <EmptyState
        icon={Star}
        title="Nenhuma questão favoritada"
        description="Marque questões como favoritas durante um simulado ou no caderno de erros para revisá-las aqui."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {visibleItems.map((item) => (
        <li key={item.questionId}>
          <Card>
            <CardContent className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline">{item.subjectName}</Badge>
                  {item.topicName ? <Badge variant="outline">{item.topicName}</Badge> : null}
                  {item.board ? <Badge variant="outline">{item.board}</Badge> : null}
                  <Badge variant="outline" className={DIFFICULTY_BADGE_CLASS[item.difficulty]}>
                    {DIFFICULTY_LABEL[item.difficulty]}
                  </Badge>
                </div>
                <FavoriteToggleButton
                  questionId={item.questionId}
                  initialFavorite
                  onToggled={(isFavorite) => {
                    if (isFavorite) return;
                    setVisibleIds((previous) => {
                      const next = new Set(previous);
                      next.delete(item.questionId);
                      return next;
                    });
                  }}
                />
              </div>
              <p className="text-sm">{item.statement}</p>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
