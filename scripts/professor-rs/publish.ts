import { readFile, writeFile, rename, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import {
  packDigest,
  validatePublication,
} from "../../src/server/services/professor-rs/publication";
import { validatePack } from "../../src/content/professor-rs/schema";

async function main() {
  const [packPath, reviewPath] = process.argv.slice(2);
  if (!packPath || packPath === "--help") {
    console.log(
      "npm run professor:publish -- <pack.json> [review.json]\nSem review.json: imprime hash para revisão. Com revisão aprovada: inclui pacote no catálogo versionado. Não executa git nem deploy.",
    );
    return;
  }
  const raw = JSON.parse(await readFile(packPath, "utf8"));
  if (!reviewPath) {
    console.log(`SHA256: ${packDigest(raw)}`);
    return;
  }
  const { pack, review } = validatePublication(raw, JSON.parse(await readFile(reviewPath, "utf8")));
  const catalogPath = path.resolve("src/content/professor-rs/published.json");
  const lock = `${catalogPath}.lock`;
  await writeFile(lock, String(process.pid), { flag: "wx" });
  try {
    const existing = (JSON.parse(await readFile(catalogPath, "utf8")) as unknown[]).map(
      validatePack,
    );
    if (
      existing.some(
        (item) =>
          item.slug === pack.slug &&
          item.version === pack.version &&
          packDigest(item) !== packDigest(pack),
      )
    )
      throw new Error("Uma edição publicada é imutável: escolha uma nova version.");
    const directory = path.resolve("docs/professor-rs/reviews");
    await mkdir(directory, { recursive: true });
    await writeFile(
      path.join(directory, `${pack.slug}-${pack.version}.json`),
      JSON.stringify(review, null, 2) + "\n",
    );
    await writeFile(
      `${catalogPath}.tmp`,
      JSON.stringify([...existing.filter((item) => item.slug !== pack.slug), pack], null, 2) + "\n",
    );
    await rename(`${catalogPath}.tmp`, catalogPath);
    console.log(
      `Curso ${pack.title} incluído no catálogo. Execute npm run check e npm run build antes do commit/push.`,
    );
  } finally {
    await unlink(lock);
  }
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Falha na publicação.");
  process.exitCode = 1;
});
