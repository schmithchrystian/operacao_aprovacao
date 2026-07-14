"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { ContentStatusBadge } from "@/components/admin/content-status-badge";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import type { AdminCourseDTO, AdminQuestionDTO } from "@/contracts/admin-content";
import type { ModeratableEntityInput } from "@/contracts/admin-notifications";
import { moderateContentAction } from "@/server/actions/admin/moderation";

interface ModerationPanelProps {
  courses: AdminCourseDTO[];
  questions: AdminQuestionDTO[];
}

/**
 * Painel "Moderar conteúdo" (Fase 17 — item 7 da tarefa, versão mínima): oculta/reexibe um
 * Curso ou uma Questão trocando `status` (ARCHIVED/PUBLISHED) via `moderateContentAction` — ação
 * DIFERENTE do "arquivar" destrutivo (soft-delete) das telas `/admin/cursos` e `/admin/questoes`;
 * aqui é reversível e não exige `confirm: true`, mas ainda passa por um diálogo de confirmação
 * (CLAUDE.md/Fase 17: toda mudança sensível confirmada explicitamente).
 */
export function ModerationPanel({ courses: initialCourses, questions: initialQuestions }: ModerationPanelProps) {
  const [entityType, setEntityType] = useState<ModeratableEntityInput>("course");
  const [selectedId, setSelectedId] = useState("");
  const [courses, setCourses] = useState(initialCourses);
  const [questions, setQuestions] = useState(initialQuestions);

  const items = entityType === "course" ? courses : questions;
  const selected = items.find((item) => item.id === selectedId);
  const label = (item: AdminCourseDTO | AdminQuestionDTO) =>
    "title" in item ? item.title : item.statement.slice(0, 60);

  const handleModerate = async (hidden: boolean): Promise<boolean> => {
    if (!selected) return false;
    const result = await moderateContentAction({ entityType, id: selected.id, hidden });
    if (!result.ok) {
      toast.error(result.error.message);
      return false;
    }

    const nextStatus = hidden ? "ARCHIVED" : "PUBLISHED";
    if (entityType === "course") {
      setCourses((prev) => prev.map((c) => (c.id === selected.id ? { ...c, status: nextStatus } : c)));
    } else {
      setQuestions((prev) => prev.map((q) => (q.id === selected.id ? { ...q, status: nextStatus } : q)));
    }
    toast.success(hidden ? "Conteúdo ocultado." : "Conteúdo reexibido.");
    return true;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" aria-hidden="true" />
          Moderar conteúdo
        </CardTitle>
        <CardDescription>Oculta ou reexibe um curso ou questão publicados.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="moderation-entity-type">Tipo</Label>
            <NativeSelect
              id="moderation-entity-type"
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value as ModeratableEntityInput);
                setSelectedId("");
              }}
            >
              <option value="course">Curso</option>
              <option value="question">Questão</option>
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="moderation-item">Item</Label>
            <NativeSelect id="moderation-item" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              <option value="">Selecione...</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {label(item)}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

        {selected ? (
          <div className="border-border flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">{label(selected)}</p>
              <ContentStatusBadge status={selected.status} className="mt-1" />
            </div>
            <div className="flex gap-2">
              <ConfirmDialog
                render={<Button type="button" variant="destructive" size="sm" />}
                title="Ocultar conteúdo"
                description={`"${label(selected)}" deixará de aparecer para os alunos. Confirma?`}
                confirmLabel="Ocultar"
                destructive
                onConfirm={() => handleModerate(true)}
              >
                <EyeOff aria-hidden="true" />
                Ocultar
              </ConfirmDialog>
              <ConfirmDialog
                render={<Button type="button" variant="outline" size="sm" />}
                title="Reexibir conteúdo"
                description={`"${label(selected)}" voltará a aparecer para os alunos. Confirma?`}
                confirmLabel="Reexibir"
                onConfirm={() => handleModerate(false)}
              >
                <Eye aria-hidden="true" />
                Reexibir
              </ConfirmDialog>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
