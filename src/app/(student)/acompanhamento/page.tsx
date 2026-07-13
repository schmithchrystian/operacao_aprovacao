import type { Metadata } from "next";
import { LineChart } from "lucide-react";
import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const metadata: Metadata = { title: "Acompanhamento" };

export default function AcompanhamentoPage() {
  return (
    <FeaturePlaceholder
      title="Acompanhamento"
      description="Relatórios de tempo válido, constância e diagnóstico de preparação chegam em uma etapa dedicada."
      icon={LineChart}
      breadcrumbs={[{ label: "Início", href: "/dashboard" }, { label: "Acompanhamento" }]}
    />
  );
}
