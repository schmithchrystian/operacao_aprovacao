"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { QuestionOptionDraftInput } from "@/contracts/admin-content";

interface QuestionOptionsEditorProps {
  value: QuestionOptionDraftInput[];
  onChange: (next: QuestionOptionDraftInput[]) => void;
  error?: string;
  idPrefix: string;
}

const NEXT_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

/**
 * Editor de alternativas de uma questão (Fase 17 — caminho vertical priorizado: "criar/editar
 * questão com alternativas, marcar a correta"). Componente TOTALMENTE controlado (`value`/
 * `onChange`) — plugado via `Controller` do RHF em `create-question-dialog.tsx` e
 * `edit-question-dialog.tsx`, evitando duplicar esta lógica nos dois (e evitando o atrito de
 * tipos de `useFieldArray` genérico entre dois schemas Zod diferentes, criar vs. editar).
 *
 * Exatamente 1 alternativa correta é reforçado por rádio (não checkbox) — selecionar uma
 * desmarca as demais automaticamente, refletindo a regra do contrato
 * (`questionOptionsInputSchema`, `@/contracts/admin-content`) já na interação, embora o servidor
 * sempre revalide isso de novo.
 */
export function QuestionOptionsEditor({ value, onChange, error, idPrefix }: QuestionOptionsEditorProps) {
  const setCorrect = (index: number) => {
    onChange(value.map((option, i) => ({ ...option, isCorrect: i === index })));
  };

  const updateField = (index: number, field: "label" | "text", text: string) => {
    onChange(value.map((option, i) => (i === index ? { ...option, [field]: text } : option)));
  };

  const addOption = () => {
    onChange([...value, { label: NEXT_LABELS[value.length] ?? String(value.length + 1), text: "", isCorrect: false }]);
  };

  const removeOption = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Alternativas (marque a correta)</Label>
        <Button type="button" variant="outline" size="sm" disabled={value.length >= 10} onClick={addOption}>
          <Plus aria-hidden="true" />
          Adicionar
        </Button>
      </div>

      <div className="space-y-2">
        {value.map((option, index) => (
          <div key={index} className="flex items-start gap-2">
            <input
              type="radio"
              name={`${idPrefix}-correct-option`}
              aria-label={`Marcar alternativa ${index + 1} como correta`}
              checked={option.isCorrect}
              onChange={() => setCorrect(index)}
              className="mt-2.5 h-4 w-4 accent-primary"
            />
            <Input
              className="w-16"
              aria-label={`Rótulo da alternativa ${index + 1}`}
              value={option.label}
              onChange={(e) => updateField(index, "label", e.target.value)}
            />
            <Input
              className="flex-1"
              aria-label={`Texto da alternativa ${index + 1}`}
              value={option.text}
              onChange={(e) => updateField(index, "text", e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Remover alternativa"
              disabled={value.length <= 2}
              onClick={() => removeOption(index)}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        ))}
      </div>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
