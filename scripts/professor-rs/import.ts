import { readFile } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { validatePublication } from "../../src/server/services/professor-rs/publication";

/** Importação aditiva e atômica: edições já importadas nunca são sobrescritas. */
async function main() {
  const [packPath, reviewPath] = process.argv.slice(2);
  if (!packPath || packPath === "--help") {
    console.log(
      "npm run professor:import -- <pack.json> <review.json>\nExige DATABASE_URL. Importa cursos, aulas e questões como DRAFT; baralhos privados. A publicação do catálogo web usa professor:publish.",
    );
    return;
  }
  if (!reviewPath || !process.env.DATABASE_URL)
    throw new Error("Informe o arquivo de revisão e configure DATABASE_URL.");
  const { pack } = validatePublication(
    JSON.parse(await readFile(packPath, "utf8")),
    JSON.parse(await readFile(reviewPath, "utf8")),
  );
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const prefix = `prof-rs-${pack.slug}-${pack.version}`;
  try {
    await prisma.$transaction(
      async (tx) => {
        // Serializa importações deste pacote entre executores; a transação desfaz tudo em caso de falha.
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${prefix})::bigint)`;
        if (await tx.course.findUnique({ where: { slug: prefix } })) {
          console.log("Edição já importada; nenhuma alteração.");
          return;
        }
        const contest = await tx.contest.upsert({
          where: { slug: `prof-rs-${pack.slug}` },
          update: {},
          create: {
            slug: `prof-rs-${pack.slug}`,
            name: pack.title,
            organizingBoard: pack.board,
            description: `${pack.examLabel}\n${pack.sources.map((s) => s.url).join("\n")}`,
          },
        });
        const course = await tx.course.create({
          data: {
            id: prefix,
            slug: prefix,
            title: pack.title,
            description: `${pack.notice}\nCurso preparado pelo Professor RS. Edição ${pack.version}.`,
            teacherName: "Professor RS · conteúdo assistido por IA e revisado",
            contestId: contest.id,
            status: "DRAFT",
            workloadHours: pack.lessons.reduce((sum, l) => sum + l.minutes, 0) / 60,
          },
        });
        const exam = await tx.mockExam.create({
          data: {
            id: `${prefix}-exam`,
            title: `${pack.title} — banco autoral de revisão`,
            description:
              "Treino autoral. Não reproduz automaticamente pesos e critérios da prova oficial.",
            durationMinutes: Math.max(
              30,
              pack.lessons.reduce((sum, l) => sum + l.practice.length * 3, 0),
            ),
            status: "DRAFT",
          },
        });
        const subjectNames = [...new Set(pack.lessons.map((lesson) => lesson.subject))];
        let questionOrder = 0;
        for (const [moduleIndex, name] of subjectNames.entries()) {
          const subjectSlug = `prof-rs-${name
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/-$/, "")}`;
          const subject = await tx.subject.upsert({
            where: { slug: subjectSlug },
            update: {},
            create: { slug: subjectSlug, name },
          });
          const courseModule = await tx.module.create({
            data: {
              id: `${prefix}-m${moduleIndex}`,
              courseId: course.id,
              title: name,
              slug: subjectSlug,
              order: moduleIndex + 1,
              subjectId: subject.id,
              status: "DRAFT",
            },
          });
          const deck = await tx.flashcardDeck.create({
            data: {
              id: `${prefix}-deck${moduleIndex}`,
              title: `${pack.title} — ${name}`,
              subjectId: subject.id,
              kind: "SUBJECT",
              isPublic: false,
            },
          });
          for (const [lessonIndex, lesson] of pack.lessons
            .filter((item) => item.subject === name)
            .entries()) {
            const lessonId = `${prefix}-${lesson.id}`;
            const body = [
              ...lesson.sections.map((s) => `${s.title}\n${s.text}`),
              `Exemplo resolvido\n${lesson.workedExample}`,
              `Resumo\n${lesson.summary.join("\n")}`,
            ].join("\n\n");
            await tx.lesson.create({
              data: {
                id: lessonId,
                moduleId: courseModule.id,
                title: lesson.title,
                order: lessonIndex + 1,
                durationSeconds: lesson.minutes * 60,
                description: body,
                status: "DRAFT",
                materials: {
                  create: lesson.resources.map((resource, order) => ({
                    title: resource.title,
                    url: resource.url,
                    type: "LINK" as const,
                    order,
                  })),
                },
              },
            });
            await tx.flashcard.createMany({
              data: lesson.flashcards.map((card, i) => ({
                id: `${lessonId}-card${i}`,
                deckId: deck.id,
                subjectId: subject.id,
                question: card.front,
                answer: card.back,
                tags: [pack.career, pack.slug, pack.version],
                status: "DRAFT" as const,
              })),
            });
            for (const question of lesson.practice) {
              const questionId = `${prefix}-${question.id}`;
              await tx.question.create({
                data: {
                  id: questionId,
                  subjectId: subject.id,
                  statement: question.statement,
                  explanation: question.explanation,
                  board: "Autoral — Professor RS",
                  status: "DRAFT",
                  options: {
                    create: question.options.map((text, order) => ({
                      label: String.fromCharCode(65 + order),
                      text,
                      order,
                      isCorrect: order === question.correctIndex,
                    })),
                  },
                },
              });
              await tx.mockExamQuestion.create({
                data: { mockExamId: exam.id, questionId, order: questionOrder++ },
              });
            }
          }
        }
        console.log(
          `Importado como rascunho: ${pack.title}; ${pack.lessons.length} aulas e ${questionOrder} questões. Revise no admin antes de liberar as ferramentas de matrícula/progresso.`,
        );
      },
      { timeout: 120_000 },
    );
  } finally {
    await prisma.$disconnect();
  }
}
main().catch(() => {
  console.error(
    "Falha na importação. Confira pacote, revisão, configuração e acesso ao banco. Nenhuma transação parcial foi mantida.",
  );
  process.exitCode = 1;
});
