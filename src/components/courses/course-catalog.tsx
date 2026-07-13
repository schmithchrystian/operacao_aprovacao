"use client";

import { useMemo, useState } from "react";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import type { CourseSummaryDTO } from "@/contracts/courses";
import { CourseCard } from "./course-card";

interface CourseCatalogProps {
  courses: CourseSummaryDTO[];
}

const ALL_CONTESTS_VALUE = "todos";

/**
 * Grade do catálogo com filtro opcional por concurso. Client Component apenas pelo estado
 * do filtro (CLAUDE.md — Client só onde há interação): a lista completa já vem pronta do
 * servidor via `listCoursesAction`, o filtro só recorta o array em memória, sem nova
 * requisição.
 */
export function CourseCatalog({ courses }: CourseCatalogProps) {
  const contests = useMemo(() => {
    const seen = new Map<string, string>();
    for (const course of courses) {
      if (!seen.has(course.contestId)) seen.set(course.contestId, course.contestName);
    }
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [courses]);

  const [selectedContestId, setSelectedContestId] = useState<string>(ALL_CONTESTS_VALUE);

  const filteredCourses = useMemo(() => {
    if (selectedContestId === ALL_CONTESTS_VALUE) return courses;
    return courses.filter((course) => course.contestId === selectedContestId);
  }, [courses, selectedContestId]);

  return (
    <div className="space-y-4">
      {contests.length > 1 ? (
        <div role="group" aria-label="Filtrar cursos por concurso" className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={selectedContestId === ALL_CONTESTS_VALUE ? "default" : "outline"}
            aria-pressed={selectedContestId === ALL_CONTESTS_VALUE}
            onClick={() => setSelectedContestId(ALL_CONTESTS_VALUE)}
          >
            Todos
          </Button>
          {contests.map((contest) => (
            <Button
              key={contest.id}
              type="button"
              size="sm"
              variant={selectedContestId === contest.id ? "default" : "outline"}
              aria-pressed={selectedContestId === contest.id}
              onClick={() => setSelectedContestId(contest.id)}
            >
              {contest.name}
            </Button>
          ))}
        </div>
      ) : null}

      {filteredCourses.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredCourses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={SearchX}
          title="Nenhum curso encontrado"
          description="Não há cursos para o concurso selecionado."
        />
      )}
    </div>
  );
}
