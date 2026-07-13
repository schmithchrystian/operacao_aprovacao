import Link from "next/link";
import { BookOpen, Clock, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/shared/progress-bar";
import type { CourseDifficulty, CourseStatus, CourseSummaryDTO } from "@/contracts/courses";

const DIFFICULTY_LABEL: Record<CourseDifficulty, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

const STATUS_LABEL: Record<CourseStatus, string> = {
  nao_iniciado: "Não iniciado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

const MAX_VISIBLE_SUBJECTS = 3;

interface CourseCardProps {
  course: CourseSummaryDTO;
}

/**
 * Cartão de curso do catálogo (Server-safe — sem `"use client"` própria; é usada dentro do
 * `CourseCatalog` client só porque o filtro precisa de estado, não porque o cartão em si
 * precisa). O CTA sempre aponta para a página do curso: o rótulo muda conforme a matrícula/
 * progresso, mas quem decide matricular ou continuar de fato é a página `/cursos/[slug]`.
 */
export function CourseCard({ course }: CourseCardProps) {
  const href = `/cursos/${course.slug}`;
  const visibleSubjects = course.subjects.slice(0, MAX_VISIBLE_SUBJECTS);
  const hiddenSubjectsCount = course.subjects.length - visibleSubjects.length;

  const ctaLabel = !course.enrolled
    ? "Matricular"
    : course.status === "nao_iniciado"
      ? "Ver curso"
      : "Continuar";

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-row items-start gap-3 space-y-0">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: course.coverColor }}
          aria-hidden="true"
        >
          <BookOpen className="h-5 w-5 text-white" />
        </span>
        <div className="min-w-0">
          <CardTitle className="line-clamp-2">{course.title}</CardTitle>
          <p className="text-muted-foreground truncate text-xs">{course.contestName}</p>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="flex items-center gap-1">
            <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
            {course.teacherName}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {course.workloadHours}h
          </span>
          <Badge variant="outline">{DIFFICULTY_LABEL[course.difficulty]}</Badge>
        </div>

        {visibleSubjects.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {visibleSubjects.map((subject) => (
              <Badge key={subject} variant="secondary">
                {subject}
              </Badge>
            ))}
            {hiddenSubjectsCount > 0 ? <Badge variant="secondary">+{hiddenSubjectsCount}</Badge> : null}
          </div>
        ) : null}

        {course.enrolled ? (
          <ProgressBar
            value={course.progressPercent}
            label={STATUS_LABEL[course.status]}
            variant={course.status === "concluido" ? "success" : "default"}
          />
        ) : null}
      </CardContent>

      <CardFooter>
        <Button render={<Link href={href} />} className="w-full">
          {ctaLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}
