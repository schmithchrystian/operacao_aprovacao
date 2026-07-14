"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Archive, BookOpen, Settings2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { ContentStatusBadge } from "@/components/admin/content-status-badge";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import type { AdminContestDTO, AdminCourseDTO } from "@/contracts/admin-content";
import { archiveCourseForAdminAction } from "@/server/actions/admin/courses";
import { cn } from "@/lib/utils";
import { CreateCourseDialog } from "./create-course-dialog";
import { EditCourseDialog } from "./edit-course-dialog";

interface CoursesManagerProps {
  initialCourses: AdminCourseDTO[];
  contests: AdminContestDTO[];
  /** Só `admin` pode excluir (soft-delete) — `CONTENT_DELETE_ROLES`, `@/server/services/admin/roles.ts`.
   *  Dica visual apenas; o servidor rejeita de novo se um moderador tentar. */
  isAdmin: boolean;
}

/**
 * Gestão de cursos (Fase 17 — item 3 da tarefa, caminho vertical Curso → Módulo → Aula).
 * Client Component: mantém a lista em estado local, atualizada otimisticamente a partir do
 * retorno de cada Server Action (mesmo padrão de `@/components/flashcards/create-deck-dialog.tsx`).
 */
export function CoursesManager({ initialCourses, contests, isAdmin }: CoursesManagerProps) {
  const [courses, setCourses] = useState(initialCourses);

  const handleArchive = async (course: AdminCourseDTO): Promise<boolean> => {
    const result = await archiveCourseForAdminAction({ id: course.id, confirm: true });
    if (!result.ok) {
      toast.error(result.error.message);
      return false;
    }
    setCourses((prev) => prev.map((c) => (c.id === result.data.id ? result.data : c)));
    toast.success("Curso arquivado.");
    return true;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cursos</h1>
          <p className="text-muted-foreground text-sm">Criar, editar e gerenciar módulos e aulas.</p>
        </div>
        <CreateCourseDialog contests={contests} onCreated={(course) => setCourses((prev) => [course, ...prev])} />
      </div>

      {courses.length === 0 ? (
        <EmptyState icon={BookOpen} title="Nenhum curso cadastrado" description="Crie o primeiro curso acima." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Concurso</TableHead>
              <TableHead>Professor</TableHead>
              <TableHead>Dificuldade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.map((course) => {
              const isDeleted = Boolean(course.deletedAt);
              return (
                <TableRow key={course.id} className={isDeleted ? "opacity-60" : undefined}>
                  <TableCell className="font-medium">
                    {course.title}
                    {isDeleted ? <span className="text-destructive ml-2 text-xs">(excluído)</span> : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{course.contestName}</TableCell>
                  <TableCell className="text-muted-foreground">{course.teacherName || "—"}</TableCell>
                  <TableCell className="text-muted-foreground capitalize">{course.difficulty}</TableCell>
                  <TableCell>
                    <ContentStatusBadge status={course.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/cursos/${course.id}`}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        <Settings2 aria-hidden="true" />
                        Módulos
                      </Link>
                      {!isDeleted ? <EditCourseDialog course={course} contests={contests} onSaved={(updated) => setCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))} /> : null}
                      {isAdmin && !isDeleted ? (
                        <ConfirmDialog
                          render={<Button type="button" variant="destructive" size="sm" />}
                          title="Arquivar curso"
                          description={`Isso arquiva "${course.title}" (exclusão reversível apenas por acesso direto ao banco). Confirma?`}
                          confirmLabel="Arquivar"
                          destructive
                          onConfirm={() => handleArchive(course)}
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
