import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { professorCatalog } from "../../src/content/professor-rs/catalog";
import { assessPack, validatePack } from "../../src/content/professor-rs/schema";
import { generateLesson, researchCourse } from "../../src/server/services/professor-rs/agent";

async function main() {
  const [command, slug, ...flags] = process.argv.slice(2);
  if (!command || command === "--help") {
    console.log(
      "Professor RS: npm run professor:agent -- <research|generate|validate|status> <slug> [--limit=5]\nresearch: pesquisa edital; generate: produz aulas e retoma checkpoints; validate: lista lacunas; status: mostra progresso. Configure OPENAI_API_KEY e PROFESSOR_RS_MODEL apenas no ambiente.",
    );
    return;
  }
  if (!["research", "generate", "validate", "status"].includes(command))
    throw new Error("Comando desconhecido.");
  const seed = professorCatalog.find((pack) => pack.slug === slug);
  if (!seed) throw new Error(`Selecione: ${professorCatalog.map((p) => p.slug).join(", ")}`);
  const directory = path.resolve(".professor-rs", seed.slug);
  const packPath = path.join(directory, "pack.json");
  let pack = seed;
  try {
    pack = validatePack(JSON.parse(await readFile(packPath, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (command === "validate" || command === "status") {
    console.log(
      JSON.stringify(
        { title: pack.title, lessons: pack.lessons.length, ...assessPack(pack) },
        null,
        2,
      ),
    );
    if (command === "validate" && !assessPack(pack).readyForReview) process.exitCode = 2;
    return;
  }
  const config = {
    apiKey: process.env.OPENAI_API_KEY ?? "",
    model: process.env.PROFESSOR_RS_MODEL ?? "",
  };
  if (!config.apiKey || !config.model)
    throw new Error(
      "Configure OPENAI_API_KEY e PROFESSOR_RS_MODEL no ambiente. Nenhuma chamada foi realizada.",
    );
  await mkdir(directory, { recursive: true });
  // Lock exclusivo entre processos; nunca apaga lock de outra execução.
  const lockPath = path.join(directory, "running.lock");
  await writeFile(lockPath, String(process.pid), { flag: "wx" });
  const { unlink } = await import("node:fs/promises");
  async function save() {
    await writeFile(`${packPath}.tmp`, JSON.stringify(pack, null, 2));
    await rename(`${packPath}.tmp`, packPath);
  }
  try {
    // Releia depois de adquirir o lock: outro executor pode ter salvo entre a leitura e o lock.
    pack = seed;
    try {
      pack = validatePack(JSON.parse(await readFile(packPath, "utf8")));
      if (pack.slug !== seed.slug || pack.career !== seed.career)
        throw new Error("Checkpoint de outro concurso.");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    if (command === "research") {
      if (pack !== seed)
        throw new Error(
          "Já existe um checkpoint. Preserve-o e use outro diretório/backup antes de pesquisar uma nova edição.",
        );
      const result = await researchCourse(config, seed);
      pack = result.pack;
      await writeFile(
        path.join(directory, "research-evidence.json"),
        JSON.stringify(
          { checkedAt: new Date().toISOString(), model: config.model, urls: result.evidenceUrls },
          null,
          2,
        ),
      );
      await save();
    } else {
      if (pack === seed)
        throw new Error(
          "Execute research primeiro: a biblioteca inicial não é um programa integral.",
        );
      const limitArg = flags.find((flag) => flag.startsWith("--limit="));
      const limit = limitArg ? Number(limitArg.slice(8)) : 5;
      if (!Number.isInteger(limit) || limit < 1 || limit > 200)
        throw new Error("--limit deve estar entre 1 e 200 aulas por execução.");
      const remaining = pack.topics
        .filter((topic) => !pack.lessons.some((lesson) => lesson.topicIds.includes(topic.id)))
        .slice(0, limit);
      for (const topic of remaining) {
        console.log(`Produzindo: ${topic.subject} — ${topic.title}`);
        const result = await generateLesson(config, pack, topic.id);
        await writeFile(
          path.join(directory, `${topic.id}-evidence.json`),
          JSON.stringify(
            { checkedAt: new Date().toISOString(), model: config.model, urls: result.evidenceUrls },
            null,
            2,
          ),
        );
        pack.lessons.push(result.lesson);
        await save();
      }
    }
    console.log(JSON.stringify({ checkpoint: packPath, ...assessPack(pack) }, null, 2));
  } finally {
    await unlink(lockPath);
  }
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Falha ao executar o professor.");
  process.exitCode = 1;
});
