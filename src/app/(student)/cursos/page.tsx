import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const metadata: Metadata = { title: "Cursos" };

export default function CursosPage() {
  return (
    <FeaturePlaceholder
      title="Cursos"
      description="O catálogo de cursos em vídeo, módulos e aulas chega em uma etapa dedicada."
      icon={BookOpen}
      breadcrumbs={[{ label: "Início", href: "/dashboard" }, { label: "Cursos" }]}
    />
  );
}
