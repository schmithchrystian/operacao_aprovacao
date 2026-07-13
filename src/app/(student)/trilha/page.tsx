import type { Metadata } from "next";
import { Route } from "lucide-react";
import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const metadata: Metadata = { title: "Minha trilha" };

export default function TrilhaPage() {
  return (
    <FeaturePlaceholder
      title="Minha trilha"
      description="A trilha cronológica Curso → Módulo → Aula com seu progresso chega em uma etapa dedicada."
      icon={Route}
      breadcrumbs={[{ label: "Início", href: "/dashboard" }, { label: "Minha trilha" }]}
    />
  );
}
