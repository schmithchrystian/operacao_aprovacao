"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Archive, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import type { AdminTeacherDTO } from "@/contracts/admin-content";
import { archiveTeacherForAdminAction } from "@/server/actions/admin/teachers";
import { TeacherFormDialog } from "./teacher-form-dialog";

interface TeachersManagerProps {
  initialTeachers: AdminTeacherDTO[];
  isAdmin: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/** Gestão de professores (Fase 17 — "cadastrar/editar"). */
export function TeachersManager({ initialTeachers, isAdmin }: TeachersManagerProps) {
  const [teachers, setTeachers] = useState(initialTeachers);

  const handleArchive = async (teacher: AdminTeacherDTO): Promise<boolean> => {
    const result = await archiveTeacherForAdminAction({ id: teacher.id, confirm: true });
    if (!result.ok) {
      toast.error(result.error.message);
      return false;
    }
    setTeachers((prev) => prev.map((t) => (t.id === result.data.id ? result.data : t)));
    toast.success("Professor arquivado.");
    return true;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Professores</h1>
          <p className="text-muted-foreground text-sm">Vinculados a módulos e aulas dos cursos.</p>
        </div>
        <TeacherFormDialog onSaved={(teacher) => setTeachers((prev) => [teacher, ...prev])} />
      </div>

      {teachers.length === 0 ? (
        <EmptyState icon={GraduationCap} title="Nenhum professor cadastrado" description="Crie o primeiro professor acima." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.map((teacher) => {
              const isDeleted = Boolean(teacher.deletedAt);
              return (
                <TableRow key={teacher.id} className={isDeleted ? "opacity-60" : undefined}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        {teacher.avatarUrl ? <AvatarImage src={teacher.avatarUrl} alt="" /> : null}
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                          {getInitials(teacher.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {teacher.name}
                        {isDeleted ? <span className="text-destructive ml-2 text-xs">(excluído)</span> : null}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {!isDeleted ? (
                        <TeacherFormDialog
                          teacher={teacher}
                          onSaved={(updated) => setTeachers((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))}
                        />
                      ) : null}
                      {isAdmin && !isDeleted ? (
                        <ConfirmDialog
                          render={<Button type="button" variant="destructive" size="sm" />}
                          title="Arquivar professor"
                          description={`Isso arquiva "${teacher.name}". Confirma?`}
                          confirmLabel="Arquivar"
                          destructive
                          onConfirm={() => handleArchive(teacher)}
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
