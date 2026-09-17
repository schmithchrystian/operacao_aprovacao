import { professorCatalog } from "@/content/professor-rs/catalog";
import published from "@/content/professor-rs/published.json";
import { validatePack } from "@/content/professor-rs/schema";

/** Conteúdo versionado em build. Nenhuma credencial ou saída bruta da API chega ao navegador. */
export function listProfessorCourses() {
  const reviewed = published.map((pack) => validatePack(pack));
  return [
    ...professorCatalog.filter((pack) => !reviewed.some((item) => item.slug === pack.slug)),
    ...reviewed,
  ];
}
export function getProfessorCourse(slug: string) {
  return listProfessorCourses().find((pack) => pack.slug === slug);
}
