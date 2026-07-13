import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const metadata: Metadata = { title: "Ranking" };

export default function RankingPage() {
  return (
    <FeaturePlaceholder
      title="Ranking"
      description="O ranking com métricas compostas de desempenho, aulas e constância chega em uma etapa dedicada."
      icon={Trophy}
      breadcrumbs={[{ label: "Início", href: "/dashboard" }, { label: "Ranking" }]}
    />
  );
}
