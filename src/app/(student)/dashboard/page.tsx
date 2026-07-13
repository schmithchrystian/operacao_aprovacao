import type { Metadata } from "next";
import { LayoutDashboard } from "lucide-react";
import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const metadata: Metadata = { title: "Início" };

export default function DashboardPage() {
  return (
    <FeaturePlaceholder
      title="Início"
      description="Seu painel com XP, progresso das trilhas e próximos passos chega em uma etapa dedicada."
      icon={LayoutDashboard}
      breadcrumbs={[{ label: "Início" }]}
    />
  );
}
