"use client";

import { useMemo, useState } from "react";
import { SearchX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { NativeSelect } from "@/components/ui/native-select";
import { FavoriteToggleButton } from "@/components/simulations/favorite-toggle-button";
import { DIFFICULTY_BADGE_CLASS, DIFFICULTY_LABEL } from "@/components/simulations/labels";
import { formatDatePtBr } from "@/lib/utils";
import type { ErrorNotebookItemDTO } from "@/contracts/simulations";

interface ErrorNotebookListProps {
  items: ErrorNotebookItemDTO[];
}

const ALL_SUBJECTS_VALUE = "todas";

/**
 * Caderno de erros com filtro por matéria (em memória — a lista completa já vem pronta do
 * servidor via `getErrorNotebookAction`; filtrar aqui não dispara nova requisição). Client
 * Component só pelo estado do filtro, mesmo padrão de `CourseCatalog`. Ordenação (mais
 * recorrente primeiro) e `wrongCount`/`lastAnsweredAt`/`explanation` já vêm prontos do backend.
 */
export function ErrorNotebookList({ items }: ErrorNotebookListProps) {
  const subjects = useMemo(
    () => Array.from(new Set(items.map((item) => item.subjectName))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [items],
  );
  const [selectedSubject, setSelectedSubject] = useState<string>(ALL_SUBJECTS_VALUE);

  const filteredItems = useMemo(
    () =>
      selectedSubject === ALL_SUBJECTS_VALUE
        ? items
        : items.filter((item) => item.subjectName === selectedSubject),
    [items, selectedSubject],
  );

  return (
    <div className="space-y-4">
      {subjects.length > 1 ? (
        <div className="flex flex-col gap-1.5 sm:w-64">
          <label htmlFor="error-notebook-subject" className="text-muted-foreground text-xs font-medium">
            Filtrar por matéria
          </label>
          <NativeSelect
            id="error-notebook-subject"
            value={selectedSubject}
            onChange={(event) => setSelectedSubject(event.target.value)}
          >
            <option value={ALL_SUBJECTS_VALUE}>Todas as matérias</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </NativeSelect>
        </div>
      ) : null}

      {filteredItems.length === 0 ? (
        <EmptyState icon={SearchX} title="Nenhuma questão para esta matéria" />
      ) : (
        <ul className="space-y-3">
          {filteredItems.map((item) => (
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
                    <FavoriteToggleButton questionId={item.questionId} initialFavorite={item.isFavorite} />
                  </div>
                  <p className="text-sm">{item.statement}</p>
                  <p className="text-muted-foreground text-xs">
                    Errada {item.wrongCount}x · última vez em {formatDatePtBr(item.lastAnsweredAt)}
                  </p>
                  {item.explanation ? (
                    <details className="text-sm">
                      <summary className="text-primary cursor-pointer text-xs font-medium">Ver explicação</summary>
                      <p className="text-muted-foreground mt-2">{item.explanation}</p>
                    </details>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
