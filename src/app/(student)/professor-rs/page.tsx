import Link from "next/link";
import { GraduationCap, ArrowUpRight, BookOpen, ShieldCheck } from "lucide-react";
import { listProfessorCourses } from "@/server/services/professor-rs/catalog";
import { assessPack } from "@/content/professor-rs/schema";
export const metadata = { title: "Professor RS — Concursos de segurança" };
export default function ProfessorRSPage() {
  const courses = listProfessorCourses();
  const lessons = new Set(courses.flatMap((course) => course.lessons.map((lesson) => lesson.id)));
  return (
    <div className="space-y-8">
      <section className="from-primary/15 to-background rounded-2xl border bg-gradient-to-br p-6 sm:p-10">
        <p className="text-primary mb-4 flex items-center gap-2 text-sm font-semibold">
          <GraduationCap size={20} /> PROFESSOR RS
        </p>
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Seu próximo passo na segurança pública começa com um plano.
        </h1>
        <p className="text-muted-foreground mt-4 max-w-2xl">
          Editais de referência, aulas de fundamentos, questões comentadas e revisões organizadas
          para as carreiras do Rio Grande do Sul.
        </p>
        <div className="mt-6 flex flex-wrap gap-6 text-sm">
          <span>{courses.length} trilhas por concurso</span>
          <span>{lessons.size} aulas únicas disponíveis</span>
          <span>Revisões D+1 · D+7 · D+30</span>
        </div>
      </section>
      <div className="bg-muted/40 flex gap-3 rounded-xl border p-4 text-sm">
        <ShieldCheck className="mt-0.5 shrink-0" size={20} />
        <p>
          Biblioteca inicial em expansão. Cada trilha informa o edital utilizado e as lacunas para o
          curso integral. A existência de um edital histórico não significa inscrições abertas.
          Consulte os atos oficiais antes de tomar decisões.
        </p>
      </div>
      <section
        className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
        aria-label="Concursos e trilhas"
      >
        {courses.map((course) => {
          const assessment = assessPack(course);
          return (
            <article key={course.slug} className="bg-card flex flex-col rounded-xl border p-5">
              <div className="flex items-center justify-between">
                <span className="text-primary rounded-full border px-3 py-1 text-xs font-semibold">
                  {course.career}
                </span>
                <BookOpen size={20} className="text-muted-foreground" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">{course.title}</h2>
              <p className="text-muted-foreground mt-1 text-sm">{course.jurisdiction}</p>
              <p className="mt-4 text-sm">{course.examLabel}</p>
              <p className="text-muted-foreground mt-2 text-sm">
                {course.lessons.length} aulas ·{" "}
                {course.lessons.reduce((sum, l) => sum + l.practice.length, 0)} questões autorais
              </p>
              <p className="text-muted-foreground mt-2 text-xs">
                {assessment.readyForReview
                  ? "Estrutura completa; conferir revisão editorial"
                  : "Fundamentos disponíveis · curso integral em produção"}
              </p>
              <Link
                href={`/professor-rs/${course.slug}`}
                className="text-primary mt-6 flex items-center justify-between gap-2 font-medium"
              >
                Abrir trilha e cronograma <ArrowUpRight size={18} />
              </Link>
            </article>
          );
        })}
      </section>
      <p className="text-muted-foreground text-sm">
        GCM organizada por município. Porto Alegre e Canoas são o recorte inicial; outros municípios
        exigem pesquisa e conferência do respectivo edital.
      </p>
    </div>
  );
}
