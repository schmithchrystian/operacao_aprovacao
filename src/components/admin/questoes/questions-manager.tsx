"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Archive, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { ContentStatusBadge } from "@/components/admin/content-status-badge";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import type { AdminQuestionDTO, AdminSubjectDTO, AdminTopicDTO } from "@/contracts/admin-content";
import { archiveQuestionForAdminAction } from "@/server/actions/admin/questions";
import { CreateQuestionDialog } from "./create-question-dialog";
import { EditQuestionDialog } from "./edit-question-dialog";

interface QuestionsManagerProps {
  initialQuestions: AdminQuestionDTO[];
  subjects: AdminSubjectDTO[];
  topics: AdminTopicDTO[];
  isAdmin: boolean;
}

const DIFFICULTY_LABEL: Record<AdminQuestionDTO["difficulty"], string> = {
  EASY: "Fácil",
  MEDIUM: "Média",
  HARD: "Difícil",
};

/** Gestão de questões (Fase 17 — caminho vertical priorizado). Mesmo padrão de
 *  `@/components/admin/cursos/courses-manager.tsx`. */
export function QuestionsManager({ initialQuestions, subjects, topics, isAdmin }: QuestionsManagerProps) {
  const [questions, setQuestions] = useState(initialQuestions);
  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "—";

  const handleArchive = async (question: AdminQuestionDTO): Promise<boolean> => {
    const result = await archiveQuestionForAdminAction({ id: question.id, confirm: true });
    if (!result.ok) {
      toast.error(result.error.message);
      return false;
    }
    setQuestions((prev) => prev.map((q) => (q.id === result.data.id ? result.data : q)));
    toast.success("Questão arquivada.");
    return true;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Questões</h1>
          <p className="text-muted-foreground text-sm">Banco de questões usado em simulados e prática.</p>
        </div>
        <CreateQuestionDialog
          subjects={subjects}
          topics={topics}
          onCreated={(question) => setQuestions((prev) => [question, ...prev])}
        />
      </div>

      {questions.length === 0 ? (
        <EmptyState icon={HelpCircle} title="Nenhuma questão cadastrada" description="Crie a primeira questão acima." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Enunciado</TableHead>
              <TableHead>Matéria</TableHead>
              <TableHead>Dificuldade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.map((question) => {
              const isDeleted = Boolean(question.deletedAt);
              return (
                <TableRow key={question.id} className={isDeleted ? "opacity-60" : undefined}>
                  <TableCell className="max-w-md">
                    <p className="line-clamp-2 font-medium">{question.statement}</p>
                    {isDeleted ? <span className="text-destructive text-xs">(excluída)</span> : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{subjectName(question.subjectId)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{DIFFICULTY_LABEL[question.difficulty]}</Badge>
                  </TableCell>
                  <TableCell>
                    <ContentStatusBadge status={question.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {!isDeleted ? (
                        <EditQuestionDialog
                          question={question}
                          subjects={subjects}
                          topics={topics}
                          onSaved={(updated) => setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)))}
                        />
                      ) : null}
                      {isAdmin && !isDeleted ? (
                        <ConfirmDialog
                          render={<Button type="button" variant="destructive" size="sm" />}
                          title="Arquivar questão"
                          description="Esta questão deixará de aparecer em novos simulados/prática. Confirma?"
                          confirmLabel="Arquivar"
                          destructive
                          onConfirm={() => handleArchive(question)}
                        >
                          <Archive aria-hidden="true" />
                          Arquivar
                        </ConfirmDialog>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
