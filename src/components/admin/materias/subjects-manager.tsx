"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Archive, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import type { AdminSubjectDTO } from "@/contracts/admin-content";
import { archiveSubjectForAdminAction } from "@/server/actions/admin/subjects";
import { SubjectFormDialog } from "./subject-form-dialog";

interface SubjectsManagerProps {
  initialSubjects: AdminSubjectDTO[];
  isAdmin: boolean;
}

/** Gestão de matérias (Fase 17 — "cadastrar/editar"). */
export function SubjectsManager({ initialSubjects, isAdmin }: SubjectsManagerProps) {
  const [subjects, setSubjects] = useState(initialSubjects);

  const handleArchive = async (subject: AdminSubjectDTO): Promise<boolean> => {
    const result = await archiveSubjectForAdminAction({ id: subject.id, confirm: true });
    if (!result.ok) {
      toast.error(result.error.message);
      return false;
    }
    setSubjects((prev) => prev.map((s) => (s.id === result.data.id ? result.data : s)));
    toast.success("Matéria arquivada.");
    return true;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Matérias</h1>
          <p className="text-muted-foreground text-sm">Usadas por módulos, questões e assuntos.</p>
        </div>
        <SubjectFormDialog onSaved={(subject) => setSubjects((prev) => [subject, ...prev])} />
      </div>

      {subjects.length === 0 ? (
        <EmptyState icon={Layers} title="Nenhuma matéria cadastrada" description="Crie a primeira matéria acima." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subjects.map((subject) => {
              const isDeleted = Boolean(subject.deletedAt);
              return (
                <TableRow key={subject.id} className={isDeleted ? "opacity-60" : undefined}>
                  <TableCell className="font-medium">
                    {subject.name}
                    {isDeleted ? <span className="text-destructive ml-2 text-xs">(excluída)</span> : null}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {!isDeleted ? (
                        <SubjectFormDialog
                          subject={subject}
                          onSaved={(updated) => setSubjects((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))}
                        />
                      ) : null}
                      {isAdmin && !isDeleted ? (
                        <ConfirmDialog
                          render={<Button type="button" variant="destructive" size="sm" />}
                          title="Arquivar matéria"
                          description={`Isso arquiva "${subject.name}". Confirma?`}
                          confirmLabel="Arquivar"
                          destructive
                          onConfirm={() => handleArchive(subject)}
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
