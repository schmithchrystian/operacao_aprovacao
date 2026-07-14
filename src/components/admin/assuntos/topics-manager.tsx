"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Archive, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import type { AdminSubjectDTO, AdminTopicDTO } from "@/contracts/admin-content";
import { archiveTopicForAdminAction } from "@/server/actions/admin/topics";
import { TopicFormDialog } from "./topic-form-dialog";

interface TopicsManagerProps {
  initialTopics: AdminTopicDTO[];
  subjects: AdminSubjectDTO[];
  isAdmin: boolean;
}

/** Gestão de assuntos (Fase 17 — "cadastrar/editar"). */
export function TopicsManager({ initialTopics, subjects, isAdmin }: TopicsManagerProps) {
  const [topics, setTopics] = useState(initialTopics);
  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "—";

  const handleArchive = async (topic: AdminTopicDTO): Promise<boolean> => {
    const result = await archiveTopicForAdminAction({ id: topic.id, confirm: true });
    if (!result.ok) {
      toast.error(result.error.message);
      return false;
    }
    setTopics((prev) => prev.map((t) => (t.id === result.data.id ? result.data : t)));
    toast.success("Assunto arquivado.");
    return true;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assuntos</h1>
          <p className="text-muted-foreground text-sm">Subdivisões de cada matéria, usadas em questões.</p>
        </div>
        <TopicFormDialog subjects={subjects} onSaved={(topic) => setTopics((prev) => [topic, ...prev])} />
      </div>

      {topics.length === 0 ? (
        <EmptyState icon={Layers} title="Nenhum assunto cadastrado" description="Crie o primeiro assunto acima." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Matéria</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topics.map((topic) => {
              const isDeleted = Boolean(topic.deletedAt);
              return (
                <TableRow key={topic.id} className={isDeleted ? "opacity-60" : undefined}>
                  <TableCell className="font-medium">
                    {topic.name}
                    {isDeleted ? <span className="text-destructive ml-2 text-xs">(excluído)</span> : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{subjectName(topic.subjectId)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {!isDeleted ? (
                        <TopicFormDialog
                          topic={topic}
                          subjects={subjects}
                          onSaved={(updated) => setTopics((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))}
                        />
                      ) : null}
                      {isAdmin && !isDeleted ? (
                        <ConfirmDialog
                          render={<Button type="button" variant="destructive" size="sm" />}
                          title="Arquivar assunto"
                          description={`Isso arquiva "${topic.name}". Confirma?`}
                          confirmLabel="Arquivar"
                          destructive
                          onConfirm={() => handleArchive(topic)}
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
