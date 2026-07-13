import type { Metadata } from "next";
import { Lightbulb } from "lucide-react";
import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const metadata: Metadata = { title: "Brainstorm" };

export default function BrainstormPage() {
  return (
    <FeaturePlaceholder
      title="Brainstorm"
      description="O quadro com colunas (Ideias, Estudar, Revisar, Dúvidas, Resolvido) e drag-and-drop chega em uma etapa dedicada."
      icon={Lightbulb}
      breadcrumbs={[{ label: "Início", href: "/dashboard" }, { label: "Brainstorm" }]}
    />
  );
}
