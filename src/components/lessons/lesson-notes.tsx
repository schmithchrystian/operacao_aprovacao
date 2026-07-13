"use client";

import { useId, useState } from "react";
import { NotebookPen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface LessonNotesProps {
  lessonId: string;
}

/**
 * Bloco de anotações da aula. TODO(backend — fase futura): ainda não existe contrato/
 * repositório de anotações do aluno; por ora o texto vive só no estado do componente
 * (perdido ao recarregar a página) — deliberadamente não inventamos uma persistência
 * (ex.: `localStorage`) que pareça definitiva e não é (CLAUDE.md §23, "não criar objetos
 * mockados diretamente dentro das páginas"/§30, "não fazer... mocks espalhados").
 */
export function LessonNotes({ lessonId }: LessonNotesProps) {
  const [notes, setNotes] = useState("");
  const textareaId = useId();

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <NotebookPen className="text-muted-foreground h-4 w-4" aria-hidden="true" />
        <CardTitle className="text-sm font-medium">Minhas anotações</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label htmlFor={textareaId} className="sr-only">
          Anotações desta aula
        </Label>
        <textarea
          id={textareaId}
          key={lessonId}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Escreva aqui suas anotações sobre esta aula..."
          rows={5}
          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 min-h-24 w-full resize-y rounded-lg border px-2.5 py-2 text-sm outline-none focus-visible:ring-3"
        />
        <p className="text-muted-foreground text-xs">
          Rascunho local desta sessão — o salvamento permanente ainda não está disponível.
        </p>
      </CardContent>
    </Card>
  );
}
