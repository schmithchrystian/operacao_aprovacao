"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Archive, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { ContentStatusBadge } from "@/components/admin/content-status-badge";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import type { AdminMockExamDTO, AdminQuestionDTO } from "@/contracts/admin-content";
import { archiveMockExamForAdminAction } from "@/server/actions/admin/mock-exams";
import { CreateMockExamDialog } from "./create-mock-exam-dialog";

interface MockExamsManagerProps {
  initialMockExams: AdminMockExamDTO[];
  questions: AdminQuestionDTO[];
  isAdmin: boolean;
}

/**
 * Gestão de simulados de catálogo (Fase 17 — não era item explícito da tarefa, mas as Server
 * Actions completas já existiam prontas no backend; UI mínima (listar + criar + arquivar) para
 * não deixar essa funcionalidade sem tela nenhuma). Edição (título/questões/status) fica como
 * pendência — ver retorno da fase.
 */
export function MockExamsManager({ initialMockExams, questions, isAdmin }: MockExamsManagerProps) {
  const [mockExams, setMockExams] = useState(initialMockExams);

  const handleArchive = async (mockExam: AdminMockExamDTO): Promise<boolean> => {
    const result = await archiveMockExamForAdminAction({ id: mockExam.id, confirm: true });
    if (!result.ok) {
      toast.error(result.error.message);
      return false;
    }
    setMockExams((prev) => prev.map((m) => (m.id === result.data.id ? result.data : m)));
    toast.success("Simulado arquivado.");
    return true;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Simulados</h1>
          <p className="text-muted-foreground text-sm">Simulados de catálogo, disponíveis para os alunos realizarem.</p>
        </div>
        <CreateMockExamDialog questions={questions} onCreated={(mockExam) => setMockExams((prev) => [mockExam, ...prev])} />
      </div>

      {mockExams.length === 0 ? (
        <EmptyState icon={Trophy} title="Nenhum simulado cadastrado" description="Crie o primeiro simulado acima." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Questões</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockExams.map((mockExam) => {
              const isDeleted = Boolean(mockExam.deletedAt);
              return (
                <TableRow key={mockExam.id} className={isDeleted ? "opacity-60" : undefined}>
                  <TableCell className="font-medium">
                    {mockExam.title}
                    {isDeleted ? <span className="text-destructive ml-2 text-xs">(excluído)</span> : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{mockExam.durationMinutes} min</TableCell>
                  <TableCell className="text-muted-foreground">{mockExam.questionIds.length}</TableCell>
                  <TableCell>
                    <ContentStatusBadge status={mockExam.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {isAdmin && !isDeleted ? (
                        <ConfirmDialog
                          render={<Button type="button" variant="destructive" size="sm" />}
                          title="Arquivar simulado"
                          description={`Isso arquiva "${mockExam.title}". Confirma?`}
                          confirmLabel="Arquivar"
                          destructive
                          onConfirm={() => handleArchive(mockExam)}
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
