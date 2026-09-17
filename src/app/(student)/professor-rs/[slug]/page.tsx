import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfessorCourse } from "@/server/services/professor-rs/catalog";
import { assessPack } from "@/content/professor-rs/schema";
import { ProfessorPlanner } from "@/components/professor-rs/planner";
import { ProfessorQuiz } from "@/components/professor-rs/quiz";
export const metadata = { title: "Trilha de concurso — Professor RS" };
export default async function ProfessorCoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = getProfessorCourse(slug);
  if (!course) notFound();
  const assessment = assessPack(course);
  const questions = course.lessons.flatMap((lesson) =>
    lesson.practice.map(({ id, statement, options }) => ({ id, statement, options })),
  );
  return (
    <div className="space-y-8">
      <Link href="/professor-rs" className="text-primary text-sm">
        ← Todos os concursos
      </Link>
      <header className="space-y-3">
        <p className="text-primary text-sm font-semibold">
          {course.career} · {course.jurisdiction}
        </p>
        <h1 className="text-3xl font-semibold">{course.title}</h1>
        <p>
          {course.examLabel} · {course.board}
        </p>
        <p className="text-muted-foreground max-w-3xl">{course.notice}</p>
        <p className="text-muted-foreground text-xs">
          Pesquisa de referência: {course.checkedAt.split("-").reverse().join("/")} · Edição{" "}
          {course.version}
        </p>
      </header>
      <nav className="flex flex-wrap gap-3 text-sm" aria-label="Seções da trilha">
        {[
          ["fontes", "Editais e provas"],
          ["jornada", "Jornada"],
          ["aulas", "Aulas e flashcards"],
          ["cronograma", "Cronograma"],
          ["simulado", "Treino comentado"],
          ["cobertura", "Cobertura e pendências"],
        ].map(([id, title]) => (
          <a key={id} href={`#${id}`} className="rounded-full border px-4 py-2">
            {title}
          </a>
        ))}
      </nav>
      <section id="fontes" className="scroll-mt-6 space-y-4">
        <h2 className="text-xl font-semibold">Editais, provas e fontes</h2>
        {course.sources.map((source) => (
          <article key={source.url} className="rounded-xl border p-4">
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-medium underline underline-offset-4"
            >
              {source.title} ↗
            </a>
            <p className="text-muted-foreground mt-1 text-sm">
              {source.kind} · {source.note}
            </p>
          </article>
        ))}
        <p className="text-muted-foreground text-sm">
          Provas e gabaritos só serão identificados como tal após localizar os documentos
          correspondentes. Portais oficiais também permitem acompanhar retificações, chamadas e
          etapas físicas.
        </p>
      </section>
      <section id="jornada" className="scroll-mt-6 space-y-3">
        <h2 className="text-xl font-semibold">Sua jornada de estudo</h2>
        <ol className="list-inside list-decimal space-y-3 rounded-xl border p-5">
          <li>
            Leia edital e requisitos. Identifique cargo, banca, pesos e datas antes de escolher o
            objetivo.
          </li>
          <li>
            Faça o treino de fundamentos para identificar dificuldades. Separe erro de conteúdo,
            leitura e cálculo.
          </li>
          <li>
            Estude cada aula: conceito → exemplo resolvido → resolução sem consulta → resumo de
            memória.
          </li>
          <li>
            Revise por flashcards no dia seguinte, após uma semana e após um mês. Reestude os erros.
          </li>
          <li>
            A cada ciclo de seis dias com aulas, faça treino acumulado e corrija com atenção às
            justificativas.
          </li>
          <li>
            Após a cobertura integral do programa, pratique provas oficiais sob as regras do edital.
            Acompanhe separadamente TAF, documentação e demais etapas.
          </li>
        </ol>
      </section>
      <section id="aulas" className="scroll-mt-6 space-y-4">
        <h2 className="text-xl font-semibold">Aulas, resumos e flashcards</h2>
        <p className="text-muted-foreground text-sm">
          45 minutos por aula inicial: leitura ativa, exemplo, exercícios e recuperação de memória.
          Os materiais externos são abertos no site de origem.
        </p>
        {course.lessons.map((lesson, index) => (
          <details
            key={lesson.id}
            id={`aula-${lesson.id}`}
            className="bg-card scroll-mt-6 rounded-xl border p-5"
          >
            <summary className="cursor-pointer font-medium">
              {index + 1}. {lesson.title}
              <span className="text-muted-foreground mt-1 block text-xs">
                {lesson.subject} · {lesson.minutes} min
              </span>
            </summary>
            <article className="mt-6 max-w-3xl space-y-5">
              <p className="text-sm">Objetivo: {lesson.objectives.join(" ")}</p>
              {lesson.sections.map((section, i) => (
                <section key={i}>
                  <h3 className="mb-2 font-semibold">{section.title}</h3>
                  <p className="text-muted-foreground leading-7 whitespace-pre-line">
                    {section.text}
                  </p>
                </section>
              ))}
              <section className="bg-muted/50 rounded-lg p-4">
                <h3 className="mb-2 font-semibold">Exemplo resolvido</h3>
                <p className="leading-7">{lesson.workedExample}</p>
              </section>
              <section>
                <h3 className="mb-2 font-semibold">Resumo para revisão</h3>
                <ul className="list-inside list-disc space-y-2">
                  {lesson.summary.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </section>
              <section className="space-y-2">
                <h3 className="font-semibold">Flashcards · responda antes de revelar</h3>
                {lesson.flashcards.map((card, i) => (
                  <details key={i} className="rounded-lg border p-3">
                    <summary className="cursor-pointer">{card.front}</summary>
                    <p className="text-muted-foreground mt-3">{card.back}</p>
                  </details>
                ))}
              </section>
              <section className="space-y-2">
                <h3 className="font-semibold">Leitura e recursos indicados</h3>
                {lesson.resources.map((resource, i) => (
                  <p key={i}>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-4"
                    >
                      {resource.title} ↗
                    </a>
                    <span className="text-muted-foreground block text-xs">
                      {resource.kind} · {resource.note}
                    </span>
                  </p>
                ))}
                {!lesson.resources.some((r) => r.kind === "video") && (
                  <p className="text-muted-foreground text-sm">
                    Videoaula específica ainda em curadoria. A aula escrita está disponível acima.
                  </p>
                )}
              </section>
              <details className="rounded-lg border p-4">
                <summary className="cursor-pointer font-medium">Praticar esta aula</summary>
                <div className="mt-5">
                  <ProfessorQuiz
                    slug={slug}
                    questions={lesson.practice.map(({ id, statement, options }) => ({
                      id,
                      statement,
                      options,
                    }))}
                  />
                </div>
              </details>
            </article>
          </details>
        ))}
      </section>
      <section id="cronograma" className="scroll-mt-6 space-y-4">
        <h2 className="text-xl font-semibold">Cronograma com revisões espaçadas</h2>
        <ProfessorPlanner slug={slug} />
      </section>
      <section id="simulado" className="scroll-mt-6 space-y-4">
        <h2 className="text-xl font-semibold">Treino acumulado de fundamentos</h2>
        <details className="rounded-xl border p-5">
          <summary className="cursor-pointer">Iniciar {questions.length} questões autorais</summary>
          <div className="mt-5">
            <ProfessorQuiz slug={slug} questions={questions} />
          </div>
        </details>
      </section>
      <section id="cobertura" className="scroll-mt-6 space-y-3">
        <h2 className="text-xl font-semibold">Cobertura e pendências editoriais</h2>
        <p>
          {assessment.covered} de {assessment.total} blocos mapeados têm aula. Este indicador mede o
          mapa atual, não a porcentagem do edital completo.
        </p>
        <details className="rounded-xl border p-5">
          <summary className="cursor-pointer">
            Ver {assessment.gaps.length} pendências para concluir o curso
          </summary>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm">
            {assessment.gaps.map((gap, i) => (
              <li key={i}>{gap}</li>
            ))}
          </ul>
        </details>
      </section>
    </div>
  );
}
