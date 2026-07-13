import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const metadata: Metadata = { title: "Plano de estudos" };

export default function PlanoDeEstudosPage() {
  return (
    <FeaturePlaceholder
      title="Plano de estudos"
      description="O planejamento de metas diárias e semanais chega em uma etapa dedicada."
      icon={CalendarDays}
      breadcrumbs={[{ label: "Início", href: "/dashboard" }, { label: "Plano de estudos" }]}
    />
  );
}
