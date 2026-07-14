"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Archive, ArrowDown, ArrowUp, PlayCircle, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { ContentStatusBadge } from "@/components/admin/content-status-badge";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import type { AdminLessonDTO, AdminTeacherDTO } from "@/contracts/admin-content";
import {
  archiveLessonForAdminAction,
  listLessonsForAdminAction,
  reorderLessonsForAdminAction,
} from "@/server/actions/admin/lessons";
import { CreateLessonDialog } from "./create-lesson-dialog";
import { EditLessonDialog } from "./edit-lesson-dialog";
import { LinkVideoDialog } from "./link-video-dialog";

interface LessonsManagerProps {
  moduleId: string;
  teachers: AdminTeacherDTO[];
  isAdmin: boolean;
}

/**
 * Lista/gestão de aulas de um módulo (Fase 17 — Módulo → Aula), carregada sob demanda quando o
 * módulo é expandido (evita buscar aulas de todos os módulos de uma vez — `listLessonsForAdmin`
 * é chamado só aqui, por módulo). Client Component: chama a Server Action diretamente (mesmo
 * padrão já usado pelos diálogos de criação em `@/components/flashcards/*`).
 */
export function LessonsManager({ moduleId, teachers, isAdmin }: LessonsManagerProps) {
  const [lessons, setLessons] = useState<AdminLessonDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  useEffect(() => {
    let cancelled = false;

    listLessonsForAdminAction({ moduleId }).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setLessons([...result.data].sort((a, b) => a.order - b.order));
    });

    return () => {
      cancelled = true;
    };
  }, [moduleId]);

  const handleArchive = async (lesson: AdminLessonDTO): Promise<boolean> => {
    const result = await archiveLessonForAdminAction({ id: lesson.id, confirm: true });
    if (!result.ok) {
      toast.error(result.error.message);
      return false;
    }
    setLessons((prev) => prev?.map((item) => (item.id === result.data.id ? result.data : item)) ?? null);
    toast.success("Aula arquivada.");
    return true;
  };

  const move = async (index: number, direction: -1 | 1) => {
    if (!lessons) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;

    const reordered = [...lessons];
    const [moved] = reordered.splice(index, 1);
    if (!moved) return;
    reordered.splice(targetIndex, 0, moved);

    setIsReordering(true);
    const result = await reorderLessonsForAdminAction({
      moduleId,
      lessonIds: reordered.map((item) => item.id),
    });
    setIsReordering(false);

    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    setLessons([...result.data].sort((a, b) => a.order - b.order));
  };

  if (error) {
    return <ErrorState title="Não foi possível carregar as aulas" description={error} />;
  }

  if (!lessons) {
    return (
      <div className="space-y-2 py-2" aria-hidden="true">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3 py-2">
      <div className="flex justify-end">
        <CreateLessonDialog
          moduleId={moduleId}
          existingLessons={lessons}
          teachers={teachers}
          onCreated={(lesson) => setLessons((prev) => [...(prev ?? []), lesson].sort((a, b) => a.order - b.order))}
        />
      </div>

      {lessons.length === 0 ? (
        <EmptyState title="Nenhuma aula neste módulo" description="Crie a primeira aula acima." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Ordem</TableHead>
              <TableHead>Aula</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Vídeo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lessons.map((lesson, index) => {
              const isDeleted = Boolean(lesson.deletedAt);
              return (
                <TableRow key={lesson.id} className={isDeleted ? "opacity-60" : undefined}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Mover para cima"
                        disabled={index === 0 || isReordering || isDeleted}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Mover para baixo"
                        disabled={index === lessons.length - 1 || isReordering || isDeleted}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown aria-hidden="true" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {lesson.title}
                    {isDeleted ? <span className="text-destructive ml-2 text-xs">(excluída)</span> : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{lesson.durationMinutes} min</TableCell>
                  <TableCell>
                    {lesson.videoUrl ? (
                      <span className="text-success inline-flex items-center gap-1 text-xs">
                        <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        Vinculado
                      </span>
                    ) : (
                      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                        <VideoOff className="h-3.5 w-3.5" aria-hidden="true" />
                        Sem vídeo
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <ContentStatusBadge status={lesson.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      {!isDeleted ? (
                        <>
                          <LinkVideoDialog
                            lesson={lesson}
                            onSaved={(updated) =>
                              setLessons((prev) => prev?.map((item) => (item.id === updated.id ? updated : item)) ?? null)
                            }
                          />
                          <EditLessonDialog
                            lesson={lesson}
                            existingLessons={lessons}
                            teachers={teachers}
                            onSaved={(updated) =>
                              setLessons((prev) => prev?.map((item) => (item.id === updated.id ? updated : item)) ?? null)
                            }
                          />
                        </>
                      ) : null}
                      {isAdmin && !isDeleted ? (
                        <ConfirmDialog
                          render={<Button type="button" variant="destructive" size="icon-sm" aria-label="Arquivar aula" />}
                          title="Arquivar aula"
                          description={`Isso arquiva "${lesson.title}". Confirma?`}
                          confirmLabel="Arquivar"
                          destructive
                          onConfirm={() => handleArchive(lesson)}
                        >
                          <Archive aria-hidden="true" />
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
