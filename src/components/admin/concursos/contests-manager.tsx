"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Archive, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import type { AdminContestDTO } from "@/contracts/admin-content";
import { archiveContestForAdminAction } from "@/server/actions/admin/contests";
import { CreateContestDialog } from "./create-contest-dialog";
import { EditContestDialog } from "./edit-contest-dialog";

interface ContestsManagerProps {
  initialContests: AdminContestDTO[];
  isAdmin: boolean;
}

/** Gestão de concursos (Fase 17 — "ao menos listar + criar", com editar/arquivar de brinde
 *  já que as Server Actions já existem). */
export function ContestsManager({ initialContests, isAdmin }: ContestsManagerProps) {
  const [contests, setContests] = useState(initialContests);

  const handleArchive = async (contest: AdminContestDTO): Promise<boolean> => {
    const result = await archiveContestForAdminAction({ id: contest.id, confirm: true });
    if (!result.ok) {
      toast.error(result.error.message);
      return false;
    }
    setContests((prev) => prev.map((c) => (c.id === result.data.id ? result.data : c)));
    toast.success("Concurso arquivado.");
    return true;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Concursos</h1>
          <p className="text-muted-foreground text-sm">Concursos públicos aos quais os cursos são vinculados.</p>
        </div>
        <CreateContestDialog onCreated={(contest) => setContests((prev) => [contest, ...prev])} />
      </div>

      {contests.length === 0 ? (
        <EmptyState icon={Library} title="Nenhum concurso cadastrado" description="Crie o primeiro concurso acima." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Banca</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contests.map((contest) => {
              const isDeleted = Boolean(contest.deletedAt);
              return (
                <TableRow key={contest.id} className={isDeleted ? "opacity-60" : undefined}>
                  <TableCell className="font-medium">
                    {contest.name}
                    {isDeleted ? <span className="text-destructive ml-2 text-xs">(excluído)</span> : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{contest.organizingBoard || "—"}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {!isDeleted ? (
                        <EditContestDialog
                          contest={contest}
                          onSaved={(updated) => setContests((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))}
                        />
                      ) : null}
                      {isAdmin && !isDeleted ? (
                        <ConfirmDialog
                          render={<Button type="button" variant="destructive" size="sm" />}
                          title="Arquivar concurso"
                          description={`Isso arquiva "${contest.name}". Confirma?`}
                          confirmLabel="Arquivar"
                          destructive
                          onConfirm={() => handleArchive(contest)}
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
