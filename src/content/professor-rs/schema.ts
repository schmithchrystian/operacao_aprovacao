import { z } from "zod";

const id = z.string().regex(/^[a-z0-9][a-z0-9-]{1,99}$/);
export const httpsUrl = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  }, "Use uma URL HTTPS sem credenciais.");
export const sourceSchema = z.object({
  title: z.string().min(3),
  url: httpsUrl,
  kind: z.enum(["edital", "portal", "prova", "gabarito", "lei", "livro", "video", "curso"]),
  checkedAt: z.iso.date(),
  verified: z.boolean(),
  note: z.string(),
});
export const questionSchema = z.object({
  id,
  statement: z.string().min(15),
  options: z.array(z.string().min(1)).min(2).max(5),
  correctIndex: z.number().int().min(0).max(4),
  explanation: z.string().min(20),
});
export const lessonSchema = z.object({
  id,
  title: z.string().min(5),
  subject: z.string().min(3),
  topicIds: z.array(id).min(1),
  minutes: z.number().int().min(15).max(180),
  objectives: z.array(z.string().min(10)).min(1),
  sections: z.array(z.object({ title: z.string().min(3), text: z.string().min(80) })).min(2),
  workedExample: z.string().min(80),
  summary: z.array(z.string().min(10)).min(2),
  practice: z.array(questionSchema).min(2),
  flashcards: z.array(z.object({ front: z.string().min(10), back: z.string().min(10) })).min(2),
  resources: z.array(sourceSchema).min(1),
});
export const coursePackSchema = z.object({
  schemaVersion: z.literal(1),
  slug: id,
  version: id,
  title: z.string().min(5),
  career: z.enum(["GCM", "PM", "BOMBEIROS", "PP", "PC"]),
  jurisdiction: z.string().min(2),
  role: z.string().min(3),
  examLabel: z.string().min(3),
  board: z.string().min(2),
  checkedAt: z.iso.date(),
  notice: z.string().min(15),
  syllabusVerified: z.boolean(),
  sources: z.array(sourceSchema).min(1),
  topics: z
    .array(
      z.object({ id, subject: z.string().min(3), title: z.string().min(3), sourceUrl: httpsUrl }),
    )
    .min(1),
  lessons: z.array(lessonSchema),
  pending: z.array(z.string().min(5)),
});
export type CoursePack = z.infer<typeof coursePackSchema>;
export type ProfessorLesson = z.infer<typeof lessonSchema>;
export type ProfessorSource = z.infer<typeof sourceSchema>;

export function validatePack(input: unknown): CoursePack {
  const pack = coursePackSchema.parse(input);
  for (const [name, values] of [
    ["tópicos", pack.topics.map((t) => t.id)],
    ["aulas", pack.lessons.map((l) => l.id)],
    ["questões", pack.lessons.flatMap((l) => l.practice.map((q) => q.id))],
  ] as const) {
    if (new Set(values).size !== values.length) throw new Error(`IDs duplicados em ${name}.`);
  }
  const topics = new Set(pack.topics.map((t) => t.id));
  for (const lesson of pack.lessons) {
    if (lesson.topicIds.some((topic) => !topics.has(topic)))
      throw new Error(`Tópico inexistente: ${lesson.id}`);
    if (lesson.practice.some((q) => q.correctIndex >= q.options.length))
      throw new Error(`Gabarito inválido: ${lesson.id}`);
    if (
      lesson.practice.some(
        (q) => new Set(q.options.map((option) => option.trim())).size !== q.options.length,
      )
    )
      throw new Error(`Alternativas duplicadas: ${lesson.id}`);
  }
  for (const lesson of pack.lessons) {
    if (
      lesson.topicIds.some(
        (id) => pack.topics.find((topic) => topic.id === id)?.subject !== lesson.subject,
      )
    ) {
      throw new Error(`Disciplina divergente do tópico: ${lesson.id}`);
    }
  }
  return pack;
}

/** Cobertura estrutural não substitui a revisão pedagógica e a conferência das retificações. */
export function assessPack(pack: CoursePack) {
  const covered = new Set(pack.lessons.flatMap((lesson) => lesson.topicIds));
  const missing = pack.topics.filter((topic) => !covered.has(topic.id));
  const gaps = [...pack.pending];
  if (!pack.syllabusVerified)
    gaps.push("Conferir integralmente o programa e todas as retificações do edital.");
  for (const topic of missing) gaps.push(`Produzir aula: ${topic.subject} — ${topic.title}.`);
  for (const lesson of pack.lessons) {
    if (lesson.practice.length < 5 || lesson.flashcards.length < 5)
      gaps.push(`Ampliar para ao menos cinco questões e cinco flashcards: ${lesson.title}.`);
    if (!lesson.resources.some((r) => ["livro", "lei", "curso"].includes(r.kind) && r.verified))
      gaps.push(`Indicar leitura didática verificada: ${lesson.title}.`);
    if (!lesson.resources.some((r) => r.kind === "video" && r.verified))
      gaps.push(`Indicar videoaula verificada: ${lesson.title}.`);
  }
  if (!pack.sources.some((s) => s.kind === "prova" && s.verified))
    gaps.push("Localizar caderno de prova anterior com origem e condições de uso.");
  if (!pack.sources.some((s) => s.kind === "gabarito" && s.verified))
    gaps.push("Localizar gabarito definitivo correspondente à prova.");
  return {
    covered: pack.topics.length - missing.length,
    total: pack.topics.length,
    percent: Math.round(((pack.topics.length - missing.length) / pack.topics.length) * 100),
    gaps,
    readyForReview: gaps.length === 0,
  };
}
