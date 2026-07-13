import type { Metadata } from "next";
import { FileCheck2 } from "lucide-react";
import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const metadata: Metadata = { title: "Simulados" };

export default function SimuladosPage() {
  return (
    <FeaturePlaceholder
      title="Simulados"
      description="A criação de tentativas, correção server-side e histórico de simulados chega em uma etapa dedicada."
      icon={FileCheck2}
      breadcrumbs={[{ label: "Início", href: "/dashboard" }, { label: "Simulados" }]}
    />
  );
}
