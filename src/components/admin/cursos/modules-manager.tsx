"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Archive, ArrowDown, ArrowUp, ChevronDown, ChevronRight, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ContentStatusBadge } from "@/components/admin/content-status-badge";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import type { AdminCourseDTO, AdminModuleDTO, AdminSubjectDTO, AdminTeacherDTO } from "@/contracts/admin-content";
import { archiveModuleForAdminAction, reorderModulesForAdminAction } from "@/server/actions/admin/modules";
import { CreateModuleDialog } from "./create-module-dialog";
import { EditModuleDialog } from "./edit-module-dialog";
import { LessonsManager } from "./lessons-manager";

interface ModulesManagerProps {
  course: AdminCourseDTO;
  initialModules: AdminModuleDTO[];
  subjects: AdminSubjectDTO[];
  teachers: AdminTeacherDTO[];
  isAdmin: boolean;
}

/**
 * Gestão de módulos de um curso + aulas de cada módulo (Fase 17 — caminho vertical
 * Curso → Módulo → Aula). Cada módulo pode ser expandido para revelar `LessonsManager`, que
 * carrega as aulas sob demanda (evita `listLessonsForAdmin` para todos os módulos de uma vez).
 */
export function ModulesManager({ course, initialModules, subjects, teachers, isAdmin }: ModulesManagerProps) {
  const [modules, setModules] = useState([...initialModules].sort((a, b) => a.order - b.order));
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [isReordering, setIsReordering] = useState(false);

  const subjectName = (subjectId: string) => subjects.find((s) => s.id === subjectId)?.name ?? "—";
  const teacherName = (teacherId: string | null) => teachers.find((t) => t.id === teacherId)?.name ?? "—";

  const handleArchive = async (module: AdminModuleDTO): Promise<boolean> => {
    const result = await archiveModuleForAdminAction({ id: module.id, confirm: true });
    if (!result.ok) {
      toast.error(result.error.message);
      return false;
    }
    setModules((prev) => prev.map((item) => (item.id === result.data.id ? result.data : item)));
    toast.success("Módulo arquivado.");
    return true;
  };

  const move = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= modules.length) return;

    const reordered = [...modules];
    const [moved] = reordered.splice(index, 1);
    if (!moved) return;
    reordered.splice(targetIndex, 0, moved);

    setIsReordering(true);
    const result = await reorderModulesForAdminAction({
      courseId: course.id,
      moduleIds: reordered.map((item) => item.id),
    });
    setIsReordering(false);

    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    setModules([...result.data].sort((a, b) => a.order - b.order));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{course.title}</h1>
          <p className="text-muted-foreground text-sm">
            {course.contestName} · {course.teacherName || "Sem professor definido"}
          </p>
        </div>
        <CreateModuleDialog
          courseId={course.id}
          subjects={subjects}
          teachers={teachers}
          onCreated={(module) => setModules((prev) => [...prev, module].sort((a, b) => a.order - b.order))}
        />
      </div>

      {modules.length === 0 ? (
        <EmptyState icon={Layers} title="Nenhum módulo cadastrado" description="Crie o primeiro módulo acima." />
      ) : (
        <div className="space-y-3">
          {modules.map((module, index) => {
            const isDeleted = Boolean(module.deletedAt);
            const isOpen = Boolean(expanded[module.id]);

            return (
              <Card key={module.id} className={isDeleted ? "opacity-60" : undefined}>
                <CardContent className="space-y-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={isOpen ? "Recolher módulo" : "Expandir módulo"}
                      aria-expanded={isOpen}
                      onClick={() => setExpanded((prev) => ({ ...prev, [module.id]: !prev[module.id] }))}
                    >
                      {isOpen ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
                    </Button>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Mover módulo para cima"
                        disabled={index === 0 || isReordering || isDeleted}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Mover módulo para baixo"
                        disabled={index === modules.length - 1 || isReordering || isDeleted}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown aria-hidden="true" />
                      </Button>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {module.order}. {module.title}
                        {isDeleted ? <span className="text-destructive ml-2 text-xs">(excluído)</span> : null}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {subjectName(module.subjectId)} · {teacherName(module.teacherId)}
                      </p>
                    </div>

                    <ContentStatusBadge status={module.status} />

                    <div className="flex items-center gap-1.5">
                      {!isDeleted ? (
                        <EditModuleDialog
                          module={module}
                          subjects={subjects}
                          teachers={teachers}
                          onSaved={(updated) => setModules((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))}
                        />
                      ) : null}
                      {isAdmin && !isDeleted ? (
                        <ConfirmDialog
                          render={<Button type="button" variant="destructive" size="icon-sm" aria-label="Arquivar módulo" />}
                          title="Arquivar módulo"
                          description={`Isso arquiva "${module.title}" e não afeta as aulas diretamente. Confirma?`}
                          confirmLabel="Arquivar"
                          destructive
                          onConfirm={() => handleArchive(module)}
                        >
                          <Archive aria-hidden="true" />
                        </ConfirmDialog>
                      ) : null}
                    </div>
                  </div>

                  {isOpen ? (
                    <div className="border-border mt-2 border-t pl-8">
                      <LessonsManager moduleId={module.id} teachers={teachers} isAdmin={isAdmin} />
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
